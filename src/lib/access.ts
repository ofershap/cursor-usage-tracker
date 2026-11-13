import { getDb } from "@/lib/data";
import { isOwnerRole } from "@/lib/types";

export function getViewer(email?: string | null) {
  const viewerEmail = email?.toLowerCase() ?? null;
  const restricted = (process.env.RESTRICTED_FEATURES ?? "")
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean);
  if (!restricted.length) return { email: viewerEmail, restricted };

  const unrestrictedEmails = process.env.AUTH_UNRESTRICTED_EMAILS?.split(",").map((e) =>
    e.toLowerCase().trim(),
  );
  let unrestricted = !!viewerEmail && !!unrestrictedEmails?.includes(viewerEmail);
  if (viewerEmail && !unrestricted) {
    try {
      const row = getDb()
        .prepare("SELECT role FROM members WHERE lower(email) = ? AND is_removed = 0")
        .get(viewerEmail) as { role: string } | undefined;
      unrestricted = isOwnerRole(row?.role);
    } catch {
      unrestricted = false;
    }
  }
  return { email: viewerEmail, restricted: unrestricted ? [] : restricted };
}

export function routeFeature(pathname: string, method: string) {
  switch (true) {
    case /^\/(api\/)?users\//.test(pathname):
      return "user-details";
    case pathname === "/insights":
    case pathname === "/api/analytics":
      return "insights";
    case pathname === "/anomalies":
    case pathname === "/api/anomalies":
      return "anomalies";
    case pathname.startsWith("/api/incidents") && method !== "GET":
      return "anomalies.actions";
    case pathname.startsWith("/settings"):
    case pathname.startsWith("/api/settings"):
    case pathname.startsWith("/api/groups/"):
    case pathname === "/api/groups" && method !== "GET":
      return method === "GET" ? "settings" : "settings.actions";
    default:
      return null;
  }
}
