import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";

const TEST_DB_PATH = path.join(process.cwd(), "data", "test-window-spend.db");
const DAY_MS = 86_400_000;

const midnight = Date.UTC(
  new Date().getUTCFullYear(),
  new Date().getUTCMonth(),
  new Date().getUTCDate(),
);
const daysAgo = (n: number) => new Date(midnight - n * DAY_MS).toISOString().slice(0, 10);
const noon = (n: number) => String(midnight - n * DAY_MS + DAY_MS / 2);

describe("getFullDashboard spend over a window", () => {
  let sqlite: typeof import("@/lib/data/sqlite");

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
    const bill = db.prepare(
      "INSERT INTO spending (email, cycle_start, spend_cents) VALUES (?, ?, ?)",
    );
    bill.run("a@x.com", daysAgo(35), 1000);
    bill.run("a@x.com", daysAgo(5), 500);
    const event = db.prepare(
      "INSERT INTO usage_events (user_email, timestamp, model, kind, total_cents) VALUES (?, ?, 'm', 'k', ?)",
    );
    event.run("a@x.com", noon(34), 100);
    event.run("a@x.com", noon(15), 100);
    event.run("a@x.com", noon(4), 50);
    event.run("a@x.com", noon(2), 50);
  });

  afterAll(() => {
    sqlite.getDb().close();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    delete process.env.DATABASE_PATH;
  });

  const spend = (range: number | "cycle") => {
    const d = sqlite.getFullDashboard(range);
    return {
      user: d.stats.rankedUsers[0]?.spend_cents,
      team: d.stats.totalSpendCents,
      chart: d.teamDailySpend.reduce((sum, r) => sum + r.spend_cents, 0),
    };
  };

  it("uses the billed total for the current cycle", () => {
    expect(spend("cycle")).toEqual({ user: 500, team: 500, chart: 500 });
    expect(spend(7).user).toBe(500);
  });

  it("shares the previous cycle's bill over the events inside the window", () => {
    expect(spend(30)).toEqual({ user: 1000, team: 1000, chart: 1000 });
  });

  it("counts nothing when no event falls inside the window", () => {
    expect(spend(1).user).toBe(0);
  });

  it("returns the user's spend for the selected range", () => {
    const spendFor = (range: number | "cycle") =>
      sqlite.getUserStats("a@x.com", range).windowSpendCents;
    expect(spendFor("cycle")).toBe(500);
    expect(spendFor(30)).toBe(1000);
    expect(spendFor(1)).toBe(0);
  });

  it("lists the cycle starts so charts can mark them", () => {
    expect(sqlite.getFullDashboard(30).cycleStarts).toEqual([daysAgo(35), daysAgo(5)]);
    expect(sqlite.getUserStats("a@x.com", 30).cycleStarts).toEqual([daysAgo(35), daysAgo(5)]);
  });

  it("finds how many days back the current cycle started", () => {
    expect(sqlite.getCycleWindowDays()).toBe(5);
  });
});
