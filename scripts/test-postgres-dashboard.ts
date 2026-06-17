import { getPostgresUrl } from "../src/lib/postgres-url";

process.env.DATABASE_SOURCE = "postgres";

try {
  getPostgresUrl();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  console.error("Run with: npx tsx --env-file=.env scripts/test-postgres-dashboard.ts");
  process.exit(1);
}

const { getFullDashboard, getUserStats } = await import("../src/lib/data/index");

const dash = getFullDashboard(7);
console.log("Dashboard members:", dash.stats.totalMembers);
console.log("Dashboard spend cents:", dash.stats.totalSpendCents);
console.log("Ranked users:", dash.stats.rankedUsers.length);

const email = dash.stats.rankedUsers[0]?.email;
if (email) {
  const user = getUserStats(email, 7);
  console.log("User stats for", email, "- spending rows:", user.spending.length);
}

console.log("Postgres dashboard queries OK");
