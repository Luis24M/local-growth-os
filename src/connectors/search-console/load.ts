import type { Warehouse } from "../../warehouse/duckdb/index.js";
import type { NormalizedSearchRow } from "./normalize.js";

function lit(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
function s(value: string | null): string {
  return value === null ? "NULL" : lit(value);
}
function n(value: number | null): string {
  return value === null ? "NULL" : String(value);
}

/**
 * Insert normalized Search Console rows into fact_search_query.
 * `client_id` is stamped from the caller, never from the export.
 */
export async function insertSearchRows(
  wh: Warehouse,
  clientId: string,
  rows: NormalizedSearchRow[],
): Promise<void> {
  for (const r of rows) {
    await wh.exec(
      `INSERT INTO fact_search_query (
         date, client_id, query, page, country, device,
         impressions, clicks, ctr, position, service_id, city_id
       ) VALUES (
         ${s(r.date)}, ${lit(clientId)}, ${lit(r.query)}, ${s(r.page)}, ${s(r.country)}, ${s(r.device)},
         ${n(r.impressions)}, ${n(r.clicks)}, ${n(r.ctr)}, ${n(r.position)}, ${s(r.service_id)}, ${s(r.city_id)}
       );`,
    );
  }
}
