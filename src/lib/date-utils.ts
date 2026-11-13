const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = DAYS[d.getDay()] ?? "";
  return `${day} ${dateStr.slice(5)}`;
}

// the 24h range keys its points by hour ("2026-11-09T14", UTC)
export const isHourKey = (key: string) => key.length === 13;

// the 24h charts tick every 3 hours on fixed clock hours (0h, 3h, 6h...) so the marks stay stable
export const isTickHour = (key: string) => Number(key.slice(11)) % 3 === 0;

export function formatDateTick(dateStr: string): string {
  if (isHourKey(dateStr)) return `${dateStr.slice(11)}h`;
  const d = new Date(dateStr + "T00:00:00");
  const day = DAYS[d.getDay()] ?? "";
  return `${day} ${dateStr.slice(8)}`;
}

export function formatDateLabel(dateStr: string): string {
  const date = dateStr.slice(0, 10);
  const day = DAYS[new Date(`${date}T00:00:00`).getDay()] ?? "";
  return isHourKey(dateStr) ? `${day}, ${date} ${dateStr.slice(11)}:00 UTC` : `${day}, ${dateStr}`;
}

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return "just now";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
