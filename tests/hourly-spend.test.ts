import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";

const TEST_DB_PATH = path.join(process.cwd(), "data", "test-hourly-spend.db");
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

const hourKey = (ms: number) => new Date(ms).toISOString().slice(0, 13);
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString().slice(0, 10);

describe("charts zoom on the selected range", () => {
  let sqlite: typeof import("@/lib/data/sqlite");
  const now = Date.now();

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    process.env.DATABASE_PATH = TEST_DB_PATH;
    sqlite = await import("@/lib/data/sqlite");
    const db = sqlite.getDb();
    db.prepare("INSERT INTO members (email, name, role) VALUES (?, ?, ?)").run(
      "a@x.com",
      "A",
      "member",
    );
    db.prepare("INSERT INTO spending (email, cycle_start, spend_cents) VALUES (?, ?, ?)").run(
      "a@x.com",
      daysAgo(10),
      900,
    );
    const event = db.prepare(
      "INSERT INTO usage_events (user_email, timestamp, model, kind, total_cents) VALUES (?, ?, 'm', 'k', 100)",
    );
    event.run("a@x.com", String(now - 30 * 60_000));
    event.run("a@x.com", String(now - 5 * HOUR_MS));
    event.run("a@x.com", String(now - 3 * DAY_MS + HOUR_MS));
    event.run("a@x.com", String(now - 6 * DAY_MS));
  });

  afterAll(() => {
    sqlite.getDb().close();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    delete process.env.DATABASE_PATH;
  });

  it("charts the last 24 hours hour by hour on the 24h range", () => {
    const d = sqlite.getFullDashboard(1);
    expect(d.teamDailySpend).toHaveLength(25);
    expect(d.teamDailySpend.every((r) => r.date.length === 13)).toBe(true);
    const latest = d.teamDailySpend.find((r) => r.date === hourKey(now - 30 * 60_000));
    expect(latest?.spend_cents).toBe(225);
    expect(d.dailySpendBreakdown.every((r) => r.date.length === 13)).toBe(true);
  });

  it("shows only the selected days on short ranges", () => {
    const dates = sqlite.getFullDashboard(3).teamDailySpend.map((r) => r.date);
    expect(dates.length).toBeGreaterThan(0);
    expect(dates.every((date) => date >= daysAgo(3))).toBe(true);
  });

  it("gives the user page the same hourly points on the 24h range", () => {
    const stats = sqlite.getUserStats("a@x.com", 1);
    expect(stats.dailySpend).toHaveLength(25);
    expect(stats.dailySpend.every((r) => r.date.length === 13)).toBe(true);
  });

  it("counts the requests of each hour so the user chart can draw $/req", () => {
    const stats = sqlite.getUserStats("a@x.com", 1);
    const latest = stats.dailySpend.find((r) => r.date === hourKey(now - 30 * 60_000));
    expect(latest?.requests).toBe(1);
    expect(stats.dailySpend.filter((r) => r.requests != null)).toHaveLength(2);
  });
});
