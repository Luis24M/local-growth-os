import { Warehouse } from "../warehouse/duckdb/index.js";

/** A raw CSV row: header -> cell value (all strings). */
export type CsvRow = Record<string, string>;

function lit(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Read a CSV file into raw string rows using DuckDB (no extra dependency).
 * Every column is read as text so the caller controls all typing/parsing.
 */
export async function readCsvRows(path: string): Promise<CsvRow[]> {
  const wh = await Warehouse.open(":memory:");
  try {
    const rows = await wh.all(
      `SELECT * FROM read_csv_auto(${lit(path)}, header=true, all_varchar=true, sample_size=-1);`,
    );
    return rows.map((r) => {
      const out: CsvRow = {};
      for (const [k, v] of Object.entries(r)) out[k] = v == null ? "" : String(v);
      return out;
    });
  } finally {
    await wh.close();
  }
}
