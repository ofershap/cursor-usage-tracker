const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = DAYS[d.getDay()] ?? "";
  return `${day} ${dateStr.slice(5)}`;
}

export function formatDateTick(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = DAYS[d.getDay()] ?? "";
  return `${day} ${dateStr.slice(8)}`;
}

export function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = DAYS[d.getDay()] ?? "";
  return `${day}, ${dateStr}`;
}
