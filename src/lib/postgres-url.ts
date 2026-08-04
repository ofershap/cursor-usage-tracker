/** Resolve Postgres connection string from environment (no hardcoded credentials). */
export function getPostgresUrl(): string {
  const direct = process.env.POSTGRES_URL?.trim();
  if (direct) return direct;

  const user = process.env.POSTGRES_USER?.trim();
  const password = process.env.POSTGRES_PASSWORD;
  const host = process.env.POSTGRES_HOST?.trim() ?? "localhost";
  const port = process.env.POSTGRES_PORT?.trim() ?? "5432";
  const database = process.env.POSTGRES_DB?.trim() ?? "cursor_tracker";

  if (user && password !== undefined && password !== "") {
    return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  }

  throw new Error(
    "Postgres is not configured. Set POSTGRES_URL or POSTGRES_USER + POSTGRES_PASSWORD in .env " +
      "(see .env.example).",
  );
}
