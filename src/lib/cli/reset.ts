import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { resetAll, resetSelected } from "../reset";
import { RESETTABLE_TABLES } from "../data/reset-tables";

function printUsage() {
  console.log(`Usage:
  npm run reset -- --all                    Wipe ALL tables
  npm run reset -- <table> [<table>...]     Wipe specific tables
  npm run reset -- --list                   List available tables
  npm run reset -- --yes ...                Skip confirmation prompt

Available tables:
${RESETTABLE_TABLES.map((t) => `  - ${t}`).join("\n")}`);
}

async function confirm(prompt: string): Promise<boolean> {
  const rl = createInterface({ input, output });
  const answer = (await rl.question(prompt)).trim().toLowerCase();
  rl.close();
  return answer === "yes" || answer === "y";
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  if (args.includes("--list")) {
    console.log(RESETTABLE_TABLES.join("\n"));
    process.exit(0);
  }

  const skipConfirm = args.includes("--yes") || args.includes("-y");
  const all = args.includes("--all");
  const tables = args.filter((a) => !a.startsWith("--") && a !== "-y");

  const target = all ? [...RESETTABLE_TABLES] : tables;
  if (target.length === 0) {
    console.error("[reset] No tables specified. Use --all or list table names.");
    process.exit(1);
  }

  const dbSource = process.env.DATABASE_SOURCE ?? "sqlite";
  const dbPath =
    dbSource === "postgres"
      ? (process.env.POSTGRES_URL ?? "(POSTGRES_URL not set)")
      : (process.env.DATABASE_PATH ?? "data/tracker.db");

  console.log(`[reset] Backend: ${dbSource}`);
  console.log(`[reset] Database: ${dbPath}`);
  console.log(`[reset] Tables (${target.length}): ${target.join(", ")}`);

  if (target.some((t) => t === "metadata" || t === "config")) {
    console.warn(
      "[reset] Warning: clearing metadata/config resets cycle anchors, alert state, and detection thresholds.",
    );
  }

  if (!skipConfirm) {
    const ok = await confirm(
      "This will permanently DELETE the rows above. Type 'yes' to continue: ",
    );
    if (!ok) {
      console.log("[reset] Aborted.");
      process.exit(0);
    }
  }

  const start = Date.now();
  const result = all ? resetAll() : resetSelected(target);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  if (result.errors.length > 0) {
    console.error("[reset] Errors:");
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log(`[reset] Done in ${elapsed}s — ${result.totalRows} rows cleared`);
}

main().catch((err) => {
  console.error("[reset] Fatal error:", err);
  process.exit(1);
});
