import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "lib", "data");
const src = readFileSync(path.join(dataDir, "sqlite.ts"), "utf8");

const names: string[] = [];
for (const m of src.matchAll(/^export function (\w+)/gm)) {
  const name = m[1];
  if (name) names.push(name);
}

const unique = [...new Set(names)];
const lines = unique.map((n) => `export const ${n} = backend.${n};`).join("\n");

const content = `import * as sqlite from "./sqlite";
import * as postgres from "./postgres";

const source = process.env.DATABASE_SOURCE ?? "sqlite";
if (source !== "sqlite" && source !== "postgres") {
  throw new Error(
    \`Unsupported DATABASE_SOURCE: "\${source}". Supported values: sqlite, postgres.\`,
  );
}

const backend = (source === "postgres" ? postgres : sqlite) as typeof sqlite;

${lines}

export type {
  UsageBadge,
  SpendBadge,
  ContextBadge,
  AdoptionBadge,
  RankedUser,
  DashboardStats,
  FullDashboard,
  ModelEfficiency,
  UserContextMetrics,
  CycleSummaryData,
} from "./types";

export type { CostDriverSummary } from "./postgres";
`;

writeFileSync(path.join(dataDir, "index.ts"), content);
console.log(`Generated index.ts with ${unique.length} exports`);
