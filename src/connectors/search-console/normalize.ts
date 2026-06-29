import type { CsvRow } from "../../lib/csv.js";
import { applyMappingRules, type MappingRule } from "./mapping.js";

/** Normalized fact_search_query row (without client_id, which the loader stamps). */
export interface NormalizedSearchRow {
  date: string | null;
  query: string;
  page: string | null;
  country: string | null;
  device: string | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  position: number | null;
  service_id: string | null;
  city_id: string | null;
}

export interface SearchConsoleOptions {
  rules: MappingRule[];
  /** Decimal separator used in the export (Search Console follows account locale). */
  decimal?: "." | ",";
}

export interface SearchConsoleResult {
  rows: NormalizedSearchRow[];
  stats: { total: number; imported: number; skipped: number };
}

/** Known header aliases per canonical field (case-insensitive). */
const HEADER_ALIASES: Record<string, string[]> = {
  query: ["query", "queries", "top queries", "search query"],
  page: ["page", "pages", "top pages", "landing page", "address", "url"],
  date: ["date", "day"],
  country: ["country"],
  device: ["device"],
  clicks: ["clicks", "url clicks"],
  impressions: ["impressions", "impr.", "impr"],
  ctr: ["ctr", "click through rate", "click-through rate"],
  position: ["position", "average position", "avg position", "avg. position"],
};

const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}/;

/** Build a map from canonical field -> actual header present in the CSV. */
export function resolveHeaders(headers: string[]): Partial<Record<string, string>> {
  const lower = new Map(headers.map((h) => [h.trim().toLowerCase(), h]));
  const resolved: Partial<Record<string, string>> = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const alias of aliases) {
      const hit = lower.get(alias);
      if (hit) {
        resolved[field] = hit;
        break;
      }
    }
  }
  return resolved;
}

/** Parse an integer, tolerating thousands separators of any kind. */
function parseInteger(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits === "") return null;
  return Number.parseInt(digits, 10);
}

/** Parse a decimal using the configured decimal separator. Returns null if absent. */
function parseDecimal(raw: string, decimal: "." | ","): number | null {
  let s = raw.trim();
  if (s === "") return null;
  const isPercent = s.includes("%");
  s = s.replace(/%/g, "").trim();
  // Keep digits, sign, and the decimal char; drop the thousands separator.
  const thousands = decimal === "." ? "," : ".";
  s = s.split(thousands).join("");
  if (decimal === ",") s = s.replace(",", ".");
  s = s.replace(/[^\d.\-]/g, "");
  if (s === "" || s === "-" || s === ".") return null;
  const value = Number.parseFloat(s);
  if (Number.isNaN(value)) return null;
  return isPercent ? value / 100 : value;
}

function cell(row: CsvRow, header: string | undefined): string {
  if (!header) return "";
  return (row[header] ?? "").trim();
}

/**
 * Normalize Search Console CSV rows into fact_search_query rows.
 *
 * - Headers are auto-detected (Queries/Pages/combined exports all work).
 * - Metrics are parsed, never invented: a missing metric stays null.
 * - service_id/city_id come from the configurable mapping rules.
 * - Rows with neither a query nor a page are skipped.
 */
export function normalizeSearchConsole(
  csvRows: CsvRow[],
  options: SearchConsoleOptions,
): SearchConsoleResult {
  const decimal = options.decimal ?? ".";
  const headers = resolveHeaders(csvRows.length ? Object.keys(csvRows[0]!) : []);
  const rows: NormalizedSearchRow[] = [];
  let skipped = 0;

  for (const csv of csvRows) {
    const query = cell(csv, headers.query);
    const page = cell(csv, headers.page);
    if (query === "" && page === "") {
      skipped += 1;
      continue;
    }
    const dateRaw = cell(csv, headers.date);
    const { service_id, city_id } = applyMappingRules(query, page, options.rules);
    rows.push({
      date: TIMESTAMP_RE.test(dateRaw) ? dateRaw : null,
      query,
      page: page === "" ? null : page,
      country: cell(csv, headers.country) || null,
      device: cell(csv, headers.device) || null,
      impressions: parseInteger(cell(csv, headers.impressions)),
      clicks: parseInteger(cell(csv, headers.clicks)),
      ctr: parseDecimal(cell(csv, headers.ctr), decimal),
      position: parseDecimal(cell(csv, headers.position), decimal),
      service_id,
      city_id,
    });
  }

  return { rows, stats: { total: csvRows.length, imported: rows.length, skipped } };
}
