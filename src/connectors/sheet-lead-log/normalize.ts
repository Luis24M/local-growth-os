import type { LeadLogMapping } from "./mapping.js";

/** A raw sheet row: header -> cell value (all strings). */
export type RawRow = Record<string, string>;

/** Normalized fact_lead row (PII reduced to presence flags). */
export interface NormalizedLead {
  lead_id: string;
  created_at: string | null;
  source_system: "sheet";
  service_id: string | null;
  city_id: string | null;
  landing_path: string | null;
  name_present: boolean;
  phone_present: boolean;
  email_present: boolean;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  gclid_present: boolean;
  fbclid_present: boolean;
  lead_status: string | null;
}

/** Normalized fact_event row — a click is INTENT, never a confirmed lead/sale. */
export interface NormalizedEvent {
  event_id: string;
  event_at: string | null;
  event_name: string;
  page_path: string | null;
  service_id: string | null;
  city_id: string | null;
  channel: string;
}

export interface NormalizeOptions {
  clientId: string;
  /** Config services, used to resolve a service label to its slug id. */
  services?: { id: string; name: string }[];
  /** Config cities, used to resolve a city label to its slug id. */
  cities?: { id: string; name: string }[];
}

export interface NormalizeResult {
  leads: NormalizedLead[];
  events: NormalizedEvent[];
  stats: { total: number; leads: number; clicks: number; skipped: number };
}

const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?/;

/** Lowercase slug; strips accents and non-alphanumerics. */
function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cell(row: RawRow, col: string | undefined): string {
  if (!col) return "";
  return (row[col] ?? "").trim();
}

function nullable(value: string): string | null {
  return value.length > 0 ? value : null;
}

/** Resolve a label/slug against a dimension list (by id or name), else slugify. */
function resolveDim(
  raw: string,
  dims: { id: string; name: string }[] | undefined,
): string | null {
  if (!raw) return null;
  const slug = slugify(raw);
  if (dims) {
    const match = dims.find(
      (d) => d.id === slug || slugify(d.name) === slug || d.name.toLowerCase() === raw.toLowerCase(),
    );
    if (match) return match.id;
  }
  return slug || null;
}

/**
 * Normalize raw sheet rows into fact_lead and fact_event rows.
 *
 * - `channel === mapping.formValue` → a form lead (fact_lead).
 * - `channel ∈ mapping.clickValues` → click intent (fact_event), e.g. a
 *   WhatsApp/phone tap. These are intent, not confirmed messages or sales.
 * - Any other channel value is skipped and counted.
 *
 * Names/phones/emails become presence flags only. UTM/gclid/fbclid/page/
 * service/city are preserved when their columns exist.
 */
export function normalizeLeadLog(
  rows: RawRow[],
  mapping: LeadLogMapping,
  options: NormalizeOptions,
): NormalizeResult {
  const { columns: c } = mapping;
  const leads: NormalizedLead[] = [];
  const events: NormalizedEvent[] = [];
  let skipped = 0;

  rows.forEach((row, i) => {
    const channel = cell(row, c.channel).toLowerCase();
    const createdRaw = cell(row, c.created_at);
    const created_at = TIMESTAMP_RE.test(createdRaw) ? createdRaw : null;
    const page = nullable(cell(row, c.page));
    const service_id = resolveDim(cell(row, c.service), options.services);
    const city_id = resolveDim(cell(row, c.city), options.cities);
    const idFromSheet = cell(row, c.lead_id);

    if (channel === mapping.formValue.toLowerCase()) {
      leads.push({
        lead_id: idFromSheet || `sheet:${options.clientId}:lead:${i}`,
        created_at,
        source_system: "sheet",
        service_id,
        city_id,
        landing_path: page,
        name_present: cell(row, c.name).length > 0,
        phone_present: cell(row, c.phone).length > 0,
        email_present: cell(row, c.email).length > 0,
        utm_source: nullable(cell(row, c.utm_source)),
        utm_medium: nullable(cell(row, c.utm_medium)),
        utm_campaign: nullable(cell(row, c.utm_campaign)),
        utm_content: nullable(cell(row, c.utm_content)),
        utm_term: nullable(cell(row, c.utm_term)),
        gclid_present: cell(row, c.gclid).length > 0,
        fbclid_present: cell(row, c.fbclid).length > 0,
        lead_status: nullable(cell(row, c.lead_status)),
      });
    } else if (mapping.clickValues.map((v) => v.toLowerCase()).includes(channel)) {
      events.push({
        event_id: idFromSheet || `sheet:${options.clientId}:event:${i}`,
        event_at: created_at,
        event_name: `${channel}_click`,
        page_path: page,
        service_id,
        city_id,
        channel,
      });
    } else {
      skipped += 1;
    }
  });

  return {
    leads,
    events,
    stats: { total: rows.length, leads: leads.length, clicks: events.length, skipped },
  };
}
