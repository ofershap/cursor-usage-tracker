import { describe, it, expect, vi } from "vitest";

vi.mock("next/server", () => ({ NextResponse: {} }));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

const { config } = await import("@/proxy");

describe("proxy matcher", () => {
  const matcher = new RegExp(`^${config.matcher[0]}$`);

  it("runs the proxy on pages and API routes", () => {
    expect(matcher.test("/settings")).toBe(true);
    expect(matcher.test("/api/incidents/5")).toBe(true);
  });

  it("does not let a .svg suffix skip the proxy", () => {
    expect(matcher.test("/api/incidents/5.svg")).toBe(true);
  });

  it("skips static assets", () => {
    expect(matcher.test("/_next/static/chunk.js")).toBe(false);
    expect(matcher.test("/logo.png")).toBe(false);
  });
});
