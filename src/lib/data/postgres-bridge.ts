import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSyncFn } from "synckit";

type Stmt = { sql: string; params: unknown[] };

type WorkerRequest =
  | { op: "init" }
  | { op: "query"; sql: string; params: unknown[] }
  | { op: "exec"; sql: string }
  | { op: "tx"; stmts: Stmt[] };

type WorkerResponse =
  | { ok: true; rows: Record<string, unknown>[]; rowCount: number; insertId?: number }
  | { ok: false; error: string };

const workerPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "postgres-worker.ts");

let syncWorker: ReturnType<
  typeof createSyncFn<(req: WorkerRequest) => WorkerResponse>
> | null = null;

function getSyncWorker() {
  if (!syncWorker) {
    syncWorker = createSyncFn<(req: WorkerRequest) => WorkerResponse>(workerPath, {
      timeout: 60_000,
    });
  }
  return syncWorker;
}

let schemaReady = false;

type WorkerSuccess = {
  ok: true;
  rows: Record<string, unknown>[];
  rowCount: number;
  insertId?: number;
};

function callWorker(req: WorkerRequest): WorkerSuccess {
  const res = getSyncWorker()(req);
  if (!res.ok) {
    throw new Error(res.error);
  }
  return res;
}

export function ensurePostgresSchema(): void {
  if (schemaReady) return;
  callWorker({ op: "init" });
  schemaReady = true;
}

/** Convert SQLite-style SQL to Postgres dialect for shared query strings. */
export function convertSql(sql: string): string {
  let s = sql;

  // Preserve camelCase result column names (Postgres folds unquoted identifiers to lowercase)
  s = s.replace(
    /(\bas\s+)([a-zA-Z_][a-zA-Z0-9_]*)\b/gi,
    (match, asKeyword, name) =>
      /[A-Z]/.test(name) && /[a-z]/.test(name) ? `${asKeyword}"${name}"` : match,
  );

  s = s.replace(
    /date\(CAST\(timestamp AS INTEGER\) \/ 1000,\s*'unixepoch'\)/gi,
    "to_char(to_timestamp(CAST(timestamp AS BIGINT) / 1000.0), 'YYYY-MM-DD')",
  );
  s = s.replace(
    /date\(timestamp\s*\/\s*1000,\s*'unixepoch'\)/gi,
    "to_char(to_timestamp(timestamp::bigint / 1000.0), 'YYYY-MM-DD')",
  );
  s = s.replace(
    /date\(ue\.timestamp\s*\/\s*1000,\s*'unixepoch'\)/gi,
    "to_char(to_timestamp(ue.timestamp::bigint / 1000.0), 'YYYY-MM-DD')",
  );
  s = s.replace(/CAST\(timestamp AS INTEGER\)/gi, "CAST(timestamp AS BIGINT)");
  s = s.replace(/CAST\(ue\.timestamp AS INTEGER\)/gi, "CAST(ue.timestamp AS BIGINT)");

  s = s.replace(/datetime\('now',\s*\?\)/gi, "(NOW() + (?::text)::interval)::text");
  s = s.replace(/datetime\('now'\)/gi, "NOW()::text");
  s = s.replace(/date\('now',\s*\?\)/gi, "(CURRENT_DATE + (?::text)::interval)::text");
  s = s.replace(/date\('now'\)/gi, "CURRENT_DATE::text");
  s = s.replace(/date\(\?,\s*\?\)/gi, "(?::date + (?::text)::interval)::text");
  s = s.replace(/GROUP_CONCAT\(([^)]+)\)/gi, "string_agg($1::text, ',')");
  s = s.replace(/MAX\((\w+\.\w+),\s*excluded\.(\w+)\)/gi, "GREATEST($1, excluded.$2)");
  s = s.replace(
    /CAST\(julianday\(MIN\(([^)]+)\)\)\s*-\s*julianday\(\?\)\s*\+\s*1\s*AS\s*INT\)/gi,
    "(MIN($1::date) - ?::date + 1)::int",
  );
  s = s.replace(
    /CAST\(julianday\('now'\)\s*-\s*julianday\(MIN\(([^)]+)\)\)\s*AS\s*INTEGER\)\s*\+\s*1/gi,
    "(CURRENT_DATE - MIN($1::date) + 1)::int",
  );
  s = s.replace(
    /CAST\(julianday\('now'\)\s*-\s*julianday\(MIN\(date\)\)\s*AS\s*INTEGER\)\s*\+\s*1/gi,
    "(CURRENT_DATE - MIN(date::date) + 1)::int",
  );

  s = s.replace(
    /CAST\(julianday\(\?\)\s*-\s*julianday\(\?\)\s*AS\s*INT\)/gi,
    "(?::date - ?::date)::int",
  );

  let i = 0;
  s = s.replace(/\?/g, () => `$${++i}`);
  return s;
}

function rawQuery(sql: string, params: unknown[] = []): WorkerSuccess {
  ensurePostgresSchema();
  return callWorker({ op: "query", sql, params });
}

export function pgQuery(sql: string, params: unknown[] = []): WorkerSuccess {
  return rawQuery(convertSql(sql), params);
}

export function pgExec(sql: string): void {
  ensurePostgresSchema();
  callWorker({ op: "exec", sql: convertSql(sql) });
}

export function pgTransaction(stmts: Stmt[]): void {
  ensurePostgresSchema();
  callWorker({
    op: "tx",
    stmts: stmts.map((s) => ({ sql: convertSql(s.sql), params: s.params })),
  });
}

export interface PgRunResult {
  lastInsertRowid: number;
  changes: number;
}

class PgStatement {
  constructor(private readonly sql: string) {}

  get(...params: unknown[]): unknown {
    const res = rawQuery(convertSql(this.sql), params);
    return res.rows[0];
  }

  all(...params: unknown[]): unknown[] {
    return rawQuery(convertSql(this.sql), params).rows;
  }

  run(...params: unknown[]): PgRunResult {
    if (txBuffer) {
      txBuffer.push({ sql: this.sql, params });
      return { lastInsertRowid: 0, changes: 0 };
    }
    const res = rawQuery(convertSql(this.sql), params);
    return {
      lastInsertRowid: res.insertId ?? 0,
      changes: res.rowCount,
    };
  }
}

let txBuffer: Stmt[] | null = null;

export class PgDatabase {
  prepare(sql: string): PgStatement {
    return new PgStatement(sql);
  }

  exec(sql: string): void {
    void sql;
    // Schema is bootstrapped by worker; no-op for runtime DDL
  }

  transaction<T extends () => void>(fn: T): T {
    const wrapped = (() => {
      txBuffer = [];
      try {
        fn();
        if (txBuffer.length > 0) {
          pgTransaction(txBuffer);
        }
      } finally {
        txBuffer = null;
      }
    }) as T;
    return wrapped;
  }
}
