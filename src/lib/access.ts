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
  if (/^\/(api\/)?users\//.test(pathname)) return "user-details";
  if (pathname === "/insights") return "insights";
  if (pathname === "/anomalies" || pathname === "/api/anomalies") return "anomalies";
  if (pathname.startsWith("/api/incidents") && method !== "GET") return "anomalies.actions";
  if (
    pathname.startsWith("/settings") ||
    pathname.startsWith("/api/settings") ||
    pathname.startsWith("/api/groups/") ||
    (pathname === "/api/groups" && method !== "GET")
  ) {
    return method === "GET" ? "settings" : "settings.actions";
  }
  return null;
}
