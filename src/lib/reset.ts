import { resetTables, logCollection } from "./data";
import { isResettableTable, RESETTABLE_TABLES } from "./data/reset-tables";

export interface ResetResult {
  tables: Record<string, number>;
  totalRows: number;
  errors: string[];
}

export function resetAll(): ResetResult {
  return resetSelected([...RESETTABLE_TABLES]);
}

export function resetSelected(tables: readonly string[]): ResetResult {
  const result: ResetResult = { tables: {}, totalRows: 0, errors: [] };

  const unknown = tables.filter((t) => !isResettableTable(t));
  if (unknown.length > 0) {
    result.errors.push(`Unknown tables: ${unknown.join(", ")}`);
    return result;
  }

  try {
    console.log(`[reset] Truncating ${tables.length} table(s)...`);
    const counts = resetTables(tables);
    result.tables = counts;
    result.totalRows = Object.values(counts).reduce((sum, n) => sum + n, 0);

    for (const [name, count] of Object.entries(counts)) {
      console.log(`[reset] ${name}: ${count} rows`);
    }

    logCollection("reset", result.totalRows);
    console.log(`[reset] Total: ${result.totalRows} rows cleared`);
  } catch (error) {
    const msg = `Failed to reset tables: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(msg);
    console.error(`[reset] ${msg}`);
    logCollection("reset", 0, msg);
  }

  return result;
}
