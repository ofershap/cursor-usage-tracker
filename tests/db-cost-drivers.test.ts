import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";

const TEST_DB_PATH = path.join(process.cwd(), "data", "test-cost-drivers.db");

type SqliteModule = typeof import("@/lib/data/sqlite");

describe("getUserCostDrivers", () => {
  let sqlite: SqliteModule;

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    process.env.DATABASE_PATH = TEST_DB_PATH;
    sqlite = await import("@/lib/data/sqlite");
    sqlite.getDb();
  });

  afterAll(() => {
    sqlite.getDb().close();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    delete process.env.DATABASE_PATH;
  });

  it("returns the top model for a given day", () => {
    const insert = sqlite.getDb().prepare(
      `INSERT INTO usage_events (user_email, timestamp, model, kind, total_cents)
         VALUES (?, ?, ?, 'Included', ?)`,
    );
    const ts = String(Date.UTC(2026, 5, 1, 12));
    insert.run("dev@example.com", ts, "cheap-model", 10);
    insert.run("dev@example.com", ts, "expensive-model", 90);

    const drivers = sqlite.getUserCostDrivers("dev@example.com", "2026-06-01");

    expect(drivers?.top_model).toBe("expensive-model");
    expect(drivers?.total_spend_cents).toBe(100);
  });
});
