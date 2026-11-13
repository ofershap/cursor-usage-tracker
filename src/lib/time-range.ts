export type TimeRange = number | "cycle";

export const DEFAULT_RANGE: TimeRange = "cycle";

export function parseRange(value?: string): TimeRange {
  if (value === "cycle") return "cycle";
  return parseInt(value ?? "", 10) || DEFAULT_RANGE;
}

export function userHref(email: string, range: TimeRange): string {
  const base = `/users/${encodeURIComponent(email)}`;
  return range === DEFAULT_RANGE ? base : `${base}?range=${range}`;
}

export function overviewHref(range: TimeRange): string {
  return range === DEFAULT_RANGE ? "/" : `/?range=${range}`;
}
