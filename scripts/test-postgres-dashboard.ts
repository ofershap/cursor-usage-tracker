process.env.DATABASE_SOURCE = "postgres";
process.env.POSTGRES_URL =
  process.env.POSTGRES_URL ?? "postgres://tracker:tracker@localhost:5433/cursor_tracker";

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
console.log("Dashboard query OK");

export {};
