import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { canViewUser, isOwnerRole, isRestricted } from "@/lib/types";

describe("isOwnerRole", () => {
  it("treats owner and free-owner as owners", () => {
    expect(isOwnerRole("owner")).toBe(true);
    expect(isOwnerRole("free-owner")).toBe(true);
    expect(isOwnerRole("member")).toBe(false);
    expect(isOwnerRole(undefined)).toBe(false);
  });
});

describe("isRestricted", () => {
  const viewer = { email: null, restricted: ["settings", "anomalies.actions"] };

  it("restricts listed features and their sub-features", () => {
    expect(isRestricted(viewer, "settings")).toBe(true);
    expect(isRestricted(viewer, "settings.actions")).toBe(true);
    expect(isRestricted(viewer, "anomalies.actions")).toBe(true);
  });

  it("restricts every .actions value with *.actions", () => {
    const actions = { email: null, restricted: ["*.actions"] };
    expect(isRestricted(actions, "anomalies.actions")).toBe(true);
    expect(isRestricted(actions, "settings.actions")).toBe(true);
    expect(isRestricted(actions, "settings")).toBe(false);
    expect(isRestricted(actions, "user-details")).toBe(false);
  });

  it("leaves other features and parents of listed sub-features open", () => {
    expect(isRestricted(viewer, "anomalies")).toBe(false);
    expect(isRestricted(viewer, "insights")).toBe(false);
    expect(isRestricted({ email: null, restricted: [] }, "settings")).toBe(false);
  });
});

describe("canViewUser", () => {
  it("lets unrestricted viewers view anyone", () => {
    expect(canViewUser({ email: "a@x.com", restricted: [] }, "b@x.com")).toBe(true);
  });

  it("lets restricted viewers view only themselves, ignoring case", () => {
    const member = { email: "a@x.com", restricted: ["user-details"] };
    expect(canViewUser(member, "A@x.com")).toBe(true);
    expect(canViewUser(member, "b@x.com")).toBe(false);
  });

  it("is not affected by other restricted features", () => {
    expect(canViewUser({ email: "a@x.com", restricted: ["settings"] }, "b@x.com")).toBe(true);
  });
});

describe("getViewer", () => {
  const TEST_DB_PATH = path.join(process.cwd(), "data", "test-access.db");
  let access: typeof import("@/lib/access");
  let sqlite: typeof import("@/lib/data/sqlite");

  beforeAll(async () => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    process.env.DATABASE_PATH = TEST_DB_PATH;
    sqlite = await import("@/lib/data/sqlite");
    access = await import("@/lib/access");
    const insert = sqlite
      .getDb()
      .prepare("INSERT INTO members (email, name, role) VALUES (?, ?, ?)");
    insert.run("boss@x.com", "Boss", "owner");
    insert.run("dev@x.com", "Dev", "member");
  });

  afterEach(() => {
    delete process.env.RESTRICTED_FEATURES;
    delete process.env.AUTH_UNRESTRICTED_EMAILS;
  });

  afterAll(() => {
    sqlite.getDb().close();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    delete process.env.DATABASE_PATH;
  });

  it("restricts nobody when the list is unset", () => {
    expect(access.getViewer(undefined).restricted).toEqual([]);
  });

  it("restricts anonymous visitors, even with unrestricted emails set", () => {
    process.env.RESTRICTED_FEATURES = "settings";
    process.env.AUTH_UNRESTRICTED_EMAILS = "dev@x.com";
    expect(access.getViewer(undefined).restricted).toEqual(["settings"]);
  });

  it("follows the Cursor role", () => {
    process.env.RESTRICTED_FEATURES = "settings, anomalies.actions";
    expect(access.getViewer("Boss@x.com").restricted).toEqual([]);
    expect(access.getViewer("dev@x.com").restricted).toEqual(["settings", "anomalies.actions"]);
    expect(access.getViewer("nobody@x.com").restricted).toEqual(["settings", "anomalies.actions"]);
  });

  it("lifts the restriction for listed emails, in Cursor or not", () => {
    process.env.RESTRICTED_FEATURES = "settings";
    process.env.AUTH_UNRESTRICTED_EMAILS = "dev@x.com, Nobody@x.com";
    expect(access.getViewer("dev@x.com").restricted).toEqual([]);
    expect(access.getViewer("nobody@x.com").restricted).toEqual([]);
  });

  it("ignores unknown values", () => {
    process.env.RESTRICTED_FEATURES = "setings";
    expect(isRestricted(access.getViewer("dev@x.com"), "settings")).toBe(false);
  });
});

describe("routeFeature", () => {
  it("maps pages and routes to their feature", async () => {
    const { routeFeature } = await import("@/lib/access");
    expect(routeFeature("/settings", "GET")).toBe("settings");
    expect(routeFeature("/api/groups/export", "GET")).toBe("settings");
    expect(routeFeature("/insights", "GET")).toBe("insights");
    expect(routeFeature("/anomalies", "GET")).toBe("anomalies");
    expect(routeFeature("/api/anomalies", "GET")).toBe("anomalies");
    expect(routeFeature("/users/a%40x.com", "GET")).toBe("user-details");
    expect(routeFeature("/api/users/a%40x.com", "GET")).toBe("user-details");
  });

  it("maps writes to the actions features", async () => {
    const { routeFeature } = await import("@/lib/access");
    expect(routeFeature("/api/settings", "PUT")).toBe("settings.actions");
    expect(routeFeature("/api/settings/budget", "PUT")).toBe("settings.actions");
    expect(routeFeature("/api/groups", "PATCH")).toBe("settings.actions");
    expect(routeFeature("/api/groups/import", "POST")).toBe("settings.actions");
    expect(routeFeature("/api/groups/backup-import", "POST")).toBe("settings.actions");
    expect(routeFeature("/api/incidents/3", "PATCH")).toBe("anomalies.actions");
  });

  it("leaves routes used by the overview open", async () => {
    const { routeFeature } = await import("@/lib/access");
    expect(routeFeature("/api/groups", "GET")).toBeNull();
    expect(routeFeature("/api/stats", "GET")).toBeNull();
    expect(routeFeature("/api/analytics", "GET")).toBeNull();
    expect(routeFeature("/", "GET")).toBeNull();
  });

  it("lets settings restrict its actions but not the other way round", async () => {
    const { routeFeature } = await import("@/lib/access");
    const settings = { email: null, restricted: ["settings"] };
    const actions = { email: null, restricted: ["settings.actions"] };
    expect(isRestricted(settings, routeFeature("/api/settings", "PUT") ?? "")).toBe(true);
    expect(isRestricted(actions, routeFeature("/api/settings", "GET") ?? "")).toBe(false);
    expect(isRestricted(actions, routeFeature("/api/settings", "PUT") ?? "")).toBe(true);
  });
});
