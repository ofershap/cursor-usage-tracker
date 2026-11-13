import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";

const session = vi.hoisted(() => ({ email: null as string | null }));
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => (session.email ? { user: { email: session.email } } : null)),
}));

const TEST_DB_PATH = path.join(process.cwd(), "data", "test-proxy-access.db");

describe("proxy access control", () => {
  let sqlite: typeof import("@/lib/data/sqlite");
  let proxy: typeof import("@/proxy").proxy;

  const get = (pathname: string, email: string | null = null) => {
    session.email = email;
    return proxy(new NextRequest(`http://localhost${pathname}`));
  };

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    process.env.DATABASE_PATH = TEST_DB_PATH;
    sqlite = await import("@/lib/data/sqlite");
    proxy = (await import("@/proxy")).proxy;
    const insert = sqlite
      .getDb()
      .prepare("INSERT INTO members (email, name, role) VALUES (?, ?, ?)");
    insert.run("boss@x.com", "Boss", "owner");
    insert.run("dev@x.com", "Dev", "member");
  });

  afterEach(() => {
    delete process.env.RESTRICTED_FEATURES;
    delete process.env.AUTH_SECRET;
  });

  afterAll(() => {
    sqlite.getDb().close();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    delete process.env.DATABASE_PATH;
  });

  describe("RESTRICTED_FEATURES=insights", () => {
    it("returns 403 on /api/analytics to anonymous visitors and restricted members", async () => {
      process.env.RESTRICTED_FEATURES = "insights";
      expect((await get("/api/analytics")).status).toBe(403);
      expect((await get("/api/analytics?days=7", "dev@x.com")).status).toBe(403);
    });

    it("returns 403 with auth enabled too", async () => {
      process.env.RESTRICTED_FEATURES = "insights";
      process.env.AUTH_SECRET = "secret";
      expect((await get("/api/analytics", "dev@x.com")).status).toBe(403);
    });

    it("redirects restricted viewers away from the page", async () => {
      process.env.RESTRICTED_FEATURES = "insights";
      const res = await get("/insights", "dev@x.com");
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location") ?? "").pathname).toBe("/");
    });

    it("lets owners through", async () => {
      process.env.RESTRICTED_FEATURES = "insights";
      process.env.AUTH_SECRET = "secret";
      expect((await get("/api/analytics", "boss@x.com")).status).toBe(200);
    });

    it("keeps the overview routes open", async () => {
      process.env.RESTRICTED_FEATURES = "insights";
      expect((await get("/api/stats", "dev@x.com")).status).toBe(200);
      expect((await get("/", "dev@x.com")).status).toBe(200);
    });
  });

  it("restricts nothing by default", async () => {
    expect((await get("/api/analytics")).status).toBe(200);
    expect((await get("/insights")).status).toBe(200);
  });
});
