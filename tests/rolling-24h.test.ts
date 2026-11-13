import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

const TEST_DB_PATH = path.join(process.cwd(), "data", "test-rolling-24h.db");
const at = (iso: string) => String(Date.parse(iso));

describe("24h range is a rolling window with hourly bars", () => {
  let sqlite: typeof import("@/lib/data/sqlite");

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    process.env.DATABASE_PATH = TEST_DB_PATH;
    sqlite = await import("@/lib/data/sqlite");
    const db = sqlite.getDb();
    const member = db.prepare("INSERT INTO members (email, name, role) VALUES (?, ?, 'member')");
    const spending = db.prepare(
      "INSERT INTO spending (email, cycle_start, spend_cents) VALUES (?, ?, ?)",
    );
    const event = db.prepare(
      "INSERT INTO usage_events (user_email, timestamp, model, kind, total_cents) VALUES (?, ?, 'm', 'k', 100)",
    );
    // at 14:41 UTC on the 13th, "24h" starts at 14:41 on the 12th
    member.run("b@x.com", "b");
    spending.run("b@x.com", "2026-11-01", 1000);
    member.run("c@x.com", "c");
    spending.run("c@x.com", "2026-11-01", 900);
    event.run("b@x.com", at("2026-11-12T14:51:00Z")); // 23h50 ago: inside the oldest partial hour
    event.run("b@x.com", at("2026-11-13T14:30:00Z"));
    event.run("c@x.com", at("2026-11-12T14:30:00Z")); // 24h11 ago: just outside
    event.run("c@x.com", at("2026-11-12T14:51:00Z"));
    event.run("c@x.com", at("2026-11-13T14:30:00Z"));
    // the night the clocks go back in Paris (01:00 UTC on 25 October 2026)
    member.run("e@x.com", "e");
    spending.run("e@x.com", "2026-10-01", 900);
    event.run("e@x.com", at("2026-10-24T01:45:00Z")); // 23h45 ago
    event.run("e@x.com", at("2026-10-24T01:15:00Z")); // 24h15 ago
    event.run("e@x.com", at("2026-10-25T01:10:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(() => {
    sqlite.getDb().close();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    delete process.env.DATABASE_PATH;
  });

  const freeze = (iso: string) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(iso));
  };

  it("counts an event from the oldest partial hour and leaves out an older one", () => {
    freeze("2026-11-13T14:41:00Z");
    expect(sqlite.getUserStats("b@x.com", 1).windowSpendCents).toBe(1000);
    expect(sqlite.getUserStats("c@x.com", 1).windowSpendCents).toBe(600);
  });

  it("charts from the hour 24h back to the current hour, partial ends included", () => {
    freeze("2026-11-13T14:41:00Z");
    const chart = sqlite.getFullDashboard(1).teamDailySpend;
    expect(chart[0]?.date).toBe("2026-11-12T14");
    expect(chart.at(-1)?.date).toBe("2026-11-13T14");
    expect(chart.reduce((sum, r) => sum + r.spend_cents, 0)).toBe(1000 + 600);
  });

  it("counts requests and active members from the events of the last 24 hours", () => {
    freeze("2026-11-13T14:41:00Z");
    const { stats } = sqlite.getFullDashboard(1);
    expect(stats.totalAgentRequests).toBe(4); // b: 2, c: 2 (its event at 14:30 yesterday is out)
    expect(stats.activeMembers).toBe(2);
    expect(stats.rankedUsers.find((u) => u.email === "c@x.com")?.agent_requests).toBe(2);
    // the user page counts the same events, hour by hour
    const hours = sqlite.getUserStats("c@x.com", 1).dailySpend;
    expect(hours.reduce((sum, r) => sum + (r.requests ?? 0), 0)).toBe(2);
  });

  it("is unaffected by a daylight saving change in the local time zone", () => {
    const tz = process.env.TZ;
    process.env.TZ = "Europe/Paris";
    try {
      freeze("2026-10-25T01:30:00Z");
      const stats = sqlite.getUserStats("e@x.com", 1);
      expect(stats.windowSpendCents).toBe(600);
      expect(stats.dailySpend).toHaveLength(25);
      expect(stats.dailySpend[0]?.date).toBe("2026-10-24T01");
      expect(stats.dailySpend.at(-1)?.date).toBe("2026-10-25T01");
    } finally {
      if (tz === undefined) delete process.env.TZ;
      else process.env.TZ = tz;
    }
  });
});
