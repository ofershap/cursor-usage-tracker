import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { runAsWorker } from "synckit";

const { Pool, types } = pg;

// NUMERIC -> JS number (matches sqlite REAL/INTEGER behavior for dashboard math)
types.setTypeParser(1700, (val) => parseFloat(val));
// BIGINT (SUM, COUNT, etc.) -> JS number (node-pg returns int8 as string by default)
types.setTypeParser(20, (val) => parseInt(val, 10));

type Stmt = { sql: string; params: unknown[] };

type WorkerRequest =
  | { op: "init" }
  | { op: "query"; sql: string; params: unknown[] }
  | { op: "exec"; sql: string }
  | { op: "tx"; stmts: Stmt[] };

type WorkerResponse =
  | { ok: true; rows: Record<string, unknown>[]; rowCount: number; insertId?: number }
  | { ok: false; error: string };

let pool: pg.Pool | null = null;
let initialized = false;

function getPool(): pg.Pool {
  if (pool) return pool;
  const url = process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "POSTGRES_URL is required when DATABASE_SOURCE=postgres. " +
        "Example: postgres://tracker:tracker@localhost:5432/cursor_tracker",
    );
  }
  pool = new Pool({ connectionString: url });
  return pool;
}

async function bootstrapSchema(): Promise<void> {
  if (initialized) return;
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const schemaPath = path.join(dir, "postgres-schema.sql");
  const ddl = readFileSync(schemaPath, "utf8");
  const client = await getPool().connect();
  try {
    await client.query(ddl);
  } finally {
    client.release();
  }
  initialized = true;
}

async function runQuery(sql: string, params: unknown[]): Promise<WorkerResponse> {
  await bootstrapSchema();
  const result = await getPool().query(sql, params);
  const insertId =
    result.rows.length === 1 && result.rows[0]?.id != null
      ? Number(result.rows[0].id)
      : undefined;
  return {
    ok: true,
    rows: result.rows as Record<string, unknown>[],
    rowCount: result.rowCount ?? 0,
    insertId,
  };
}

async function runExec(sql: string): Promise<WorkerResponse> {
  await bootstrapSchema();
  const result = await getPool().query(sql);
  return { ok: true, rows: [], rowCount: result.rowCount ?? 0 };
}

async function runTx(stmts: Stmt[]): Promise<WorkerResponse> {
  await bootstrapSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    let lastInsertId: number | undefined;
    for (const { sql, params } of stmts) {
      const result = await client.query(sql, params);
      if (result.rows.length === 1 && result.rows[0]?.id != null) {
        lastInsertId = Number(result.rows[0].id);
      }
    }
    await client.query("COMMIT");
    return { ok: true, rows: [], rowCount: stmts.length, insertId: lastInsertId };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

runAsWorker(async (req: WorkerRequest): Promise<WorkerResponse> => {
  try {
    switch (req.op) {
      case "init":
        await bootstrapSchema();
        return { ok: true, rows: [], rowCount: 0 };
      case "query":
        return await runQuery(req.sql, req.params);
      case "exec":
        return await runExec(req.sql);
      case "tx":
        return await runTx(req.stmts);
      default:
        return { ok: false, error: "Unknown op" };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
});
