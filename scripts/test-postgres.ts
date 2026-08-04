import { getPostgresUrl } from "../src/lib/postgres-url";

process.env.DATABASE_SOURCE = "postgres";

try {
  getPostgresUrl();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  console.error("Run with: npx tsx --env-file=.env scripts/test-postgres.ts");
  process.exit(1);
}

const { setMetadata, getMetadata, upsertMembers, getAllMembers } =
  await import("../src/lib/data/index");

setMetadata("test_key", "hello");
console.log("metadata:", getMetadata("test_key"));
upsertMembers([
  { email: "test@example.com", id: "1", name: "Test", role: "member", isRemoved: false },
]);
console.log("members:", getAllMembers().length);
console.log("Postgres backend OK");
