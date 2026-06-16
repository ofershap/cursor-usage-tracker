process.env.DATABASE_SOURCE = "postgres";
process.env.POSTGRES_URL =
  process.env.POSTGRES_URL ?? "postgres://tracker:tracker@localhost:5433/cursor_tracker";

const { setMetadata, getMetadata, upsertMembers, getAllMembers } =
  await import("../src/lib/data/index");

setMetadata("test_key", "hello");
console.log("metadata:", getMetadata("test_key"));
upsertMembers([
  { email: "test@example.com", id: "1", name: "Test", role: "member", isRemoved: false },
]);
console.log("members:", getAllMembers().length);
console.log("Postgres backend OK");

export {};
