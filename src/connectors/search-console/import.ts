import type { ClientConfig } from "../../config/index.js";
import { readCsvRows, type CsvRow } from "../../lib/csv.js";
import { buildMarts, type Warehouse } from "../../warehouse/duckdb/index.js";
import { insertSearchRows } from "./load.js";
import { defaultSeoMappingRules, type MappingRule } from "./mapping.js";
import { normalizeSearchConsole, type SearchConsoleResult } from "./normalize.js";

export interface ImportSearchConsoleOptions {
  /** Extra rules, applied before the config-derived defaults. */
  rules?: MappingRule[];
  decimal?: "." | ",";
  /** Rebuild mart_seo_opportunities after loading. Default true. */
  rebuildMarts?: boolean;
}

/** Resolve the effective rule list: explicit rules first, then config defaults. */
export function resolveRules(config: ClientConfig, extra?: MappingRule[]): MappingRule[] {
  return [...(extra ?? []), ...defaultSeoMappingRules(config)];
}

/** Normalize already-parsed rows, insert into the warehouse, refresh marts. */
export async function importSearchConsoleRows(
  wh: Warehouse,
  config: ClientConfig,
  csvRows: CsvRow[],
  options: ImportSearchConsoleOptions = {},
): Promise<SearchConsoleResult> {
  const result = normalizeSearchConsole(csvRows, {
    rules: resolveRules(config, options.rules),
    decimal: options.decimal,
  });
  await insertSearchRows(wh, config.client_id, result.rows);
  if (options.rebuildMarts !== false) await buildMarts(wh);
  return result;
}

/** Read a Search Console CSV export, normalize, insert, and refresh marts. */
export async function importSearchConsoleFile(
  wh: Warehouse,
  config: ClientConfig,
  csvPath: string,
  options: ImportSearchConsoleOptions = {},
): Promise<SearchConsoleResult> {
  const rows = await readCsvRows(csvPath);
  return importSearchConsoleRows(wh, config, rows, options);
}
