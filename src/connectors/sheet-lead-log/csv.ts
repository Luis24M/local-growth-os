import { Warehouse } from "../../warehouse/duckdb/index.js";
import type { RawRow } from "./normalize.js";

function lit(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Read a CSV file into raw string rows using DuckDB (no extra dependency).
 * Every column is read as text so the normalizer controls all typing.
 */
export async function readCsvRows(path: string): Promise<RawRow[]> {
  const wh = await Warehouse.open(":memory:");
  try {
    const rows = await wh.all(
      `SELECT * FROM read_csv_auto(${lit(path)}, header=true, all_varchar=true, sample_size=-1);`,
    );
    return rows.map((r) => {
      const out: RawRow = {};
      for (const [k, v] of Object.entries(r)) out[k] = v == null ? "" : String(v);
      return out;
    });
  } finally {
    await wh.close();
  }
}
