import { collectAll } from "../collector";

async function main() {
  console.log("[collect] Starting data collection...");
  const start = Date.now();

  const result = await collectAll();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[collect] Done in ${elapsed}s`);
  console.log(`  Members: ${result.members}`);
  console.log(`  Daily usage: ${result.dailyUsage}`);
  console.log(`  Spending: ${result.spending}`);
  console.log(`  Daily spend: ${result.dailySpend}`);
  console.log(`  Groups: ${result.groups}`);
  console.log(`  Usage events: ${result.usageEvents}`);
  console.log(`  Analytics: ${result.analytics}`);

  if (result.errors.length > 0) {
    console.error(`[collect] Errors:`);
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[collect] Fatal error:", err);
  process.exit(1);
});
