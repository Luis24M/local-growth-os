import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ClientConfig } from "../../config/index.js";
import { FACT_TABLES, type FactTable } from "./schema.js";
import type { Warehouse } from "./warehouse.js";

/** Escape a string for use as a single-quoted SQL literal. */
function lit(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/** Escape an optional string; NULL when absent. */
function litOrNull(value: string | undefined): string {
  return value === undefined ? "NULL" : lit(value);
}

/**
 * Seed dimension tables from a validated client config. No file or network
 * access — dims come straight from `clients/<client>/config.yml`.
 */
export async function seedDimensions(wh: Warehouse, config: ClientConfig): Promise<void> {
  await wh.exec(
    `INSERT INTO dim_client VALUES (${lit(config.client_id)}, ${lit(config.client_name)}, ${lit(config.domain)}, ${lit(config.timezone)}, ${lit(config.currency)});`,
  );

  for (const s of config.services) {
    await wh.exec(
      `INSERT INTO dim_service VALUES (${lit(s.id)}, ${lit(config.client_id)}, ${lit(s.name)}, ${s.active ? "TRUE" : "FALSE"}, ${litOrNull(s.margin_tier)}, ${s.priority});`,
    );
  }

  for (const c of config.cities) {
    await wh.exec(
      `INSERT INTO dim_city VALUES (${lit(c.id)}, ${lit(config.client_id)}, ${lit(c.name)}, ${litOrNull(c.region)}, ${c.priority});`,
    );
  }
}

interface LoadedFact {
  table: FactTable;
  file: string;
  rows: number;
}

/** Build the DuckDB table-function expression for a source file. */
function readerExpr(file: string): string {
  const path = lit(file);
  return file.endsWith(".json")
    ? `read_json_auto(${path})`
    : `read_csv_auto(${path}, header=true, sample_size=-1)`;
}

/**
 * Load one file into a fact table. Only columns present in both the file and
 * the table are inserted; `client_id` is set from the config, never the file.
 */
async function loadFile(
  wh: Warehouse,
  table: FactTable,
  file: string,
  clientId: string,
): Promise<number> {
  const reader = readerExpr(file);
  const described = await wh.all(`DESCRIBE SELECT * FROM ${reader};`);
  const sourceCols = new Set(described.map((r) => String(r.column_name)));
  const tableCols = await wh.columns(table);

  const common = tableCols.filter((c) => c !== "client_id" && sourceCols.has(c));
  if (common.length === 0) {
    throw new Error(`File ${file} has no columns matching table ${table}`);
  }

  const colList = ["client_id", ...common].map((c) => `"${c}"`).join(", ");
  const selectList = [lit(clientId), ...common.map((c) => `"${c}"`)].join(", ");
  await wh.exec(`INSERT INTO ${table} (${colList}) SELECT ${selectList} FROM ${reader};`);

  const counted = await wh.all(`SELECT COUNT(*) AS n FROM ${reader};`);
  return Number(counted[0]?.n ?? 0);
}

/**
 * Load fact tables from `dataDir`, looking for `<table>.csv` then `<table>.json`.
 * Missing files are simply skipped (an empty source is valid).
 */
export async function loadFacts(
  wh: Warehouse,
  config: ClientConfig,
  dataDir: string,
): Promise<LoadedFact[]> {
  const loaded: LoadedFact[] = [];
  for (const table of FACT_TABLES) {
    for (const ext of ["csv", "json"]) {
      const file = join(dataDir, `${table}.${ext}`);
      if (!existsSync(file)) continue;
      const rows = await loadFile(wh, table, file, config.client_id);
      loaded.push({ table, file, rows });
      break; // first matching extension wins
    }
  }
  return loaded;
}
