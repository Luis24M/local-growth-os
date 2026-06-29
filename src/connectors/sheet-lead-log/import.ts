import type { ClientConfig } from "../../config/index.js";
import type { Warehouse } from "../../warehouse/duckdb/index.js";
import { readCsvRows } from "./csv.js";
import { insertLeadLog } from "./load.js";
import type { LeadLogMapping } from "./mapping.js";
import { normalizeLeadLog, type NormalizeResult, type RawRow } from "./normalize.js";

/** Normalize already-parsed rows and insert them into an open warehouse. */
export async function importLeadLogRows(
  wh: Warehouse,
  config: ClientConfig,
  rows: RawRow[],
  mapping: LeadLogMapping,
): Promise<NormalizeResult> {
  const result = normalizeLeadLog(rows, mapping, {
    clientId: config.client_id,
    services: config.services.map((s) => ({ id: s.id, name: s.name })),
    cities: config.cities.map((c) => ({ id: c.id, name: c.name })),
  });
  await insertLeadLog(wh, config.client_id, result.leads, result.events);
  return result;
}

/** Read a CSV lead log, normalize it, and insert into an open warehouse. */
export async function importLeadLogFile(
  wh: Warehouse,
  config: ClientConfig,
  csvPath: string,
  mapping: LeadLogMapping,
): Promise<NormalizeResult> {
  const rows = await readCsvRows(csvPath);
  return importLeadLogRows(wh, config, rows, mapping);
}
