/**
 * Column mapping for a Google Sheet / CSV lead+click log.
 *
 * The importer is mapping-driven so it works for any client's sheet layout —
 * Local Growth OS is reusable, not tied to one business. A canonical English
 * preset (`IDENTITY_MAPPING`) and the Vivi Casa Facile pilot preset
 * (`VCF_SHEET_MAPPING`, derived from the web repo's Sheet logger) ship as
 * starting points; clients with other layouts pass their own mapping.
 */

/** Canonical fields the importer understands. Map each to a source column name. */
export interface LeadLogColumns {
  /** Channel/kind column; its value decides form-lead vs click-intent. */
  channel?: string;
  /** Timestamp/date the row was created. */
  created_at?: string;
  /** Service label or slug. */
  service?: string;
  /** City label or slug. */
  city?: string;
  /** Landing page path. */
  page?: string;
  /** Personal data — used only to derive presence flags, never stored. */
  name?: string;
  phone?: string;
  email?: string;
  /** Attribution — preserved when present. */
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  fbclid?: string;
  /** Normalized CRM status, if the sheet carries one. */
  lead_status?: string;
  /** Stable id column, if the sheet has one; otherwise ids are generated. */
  lead_id?: string;
}

export interface LeadLogMapping {
  columns: LeadLogColumns;
  /** Channel value that marks a confirmed form lead (→ fact_lead). */
  formValue: string;
  /** Channel values that mark click intent (→ fact_event). Anything else is skipped. */
  clickValues: string[];
}

/** Canonical layout: column names equal the canonical field names. */
export const IDENTITY_MAPPING: LeadLogMapping = {
  columns: {
    channel: "channel",
    created_at: "created_at",
    service: "service",
    city: "city",
    page: "page",
    name: "name",
    phone: "phone",
    email: "email",
    utm_source: "utm_source",
    utm_medium: "utm_medium",
    utm_campaign: "utm_campaign",
    utm_content: "utm_content",
    utm_term: "utm_term",
    gclid: "gclid",
    fbclid: "fbclid",
    lead_status: "lead_status",
    lead_id: "lead_id",
  },
  formValue: "form",
  clickValues: ["whatsapp", "call"],
};

/**
 * Vivi Casa Facile pilot sheet (Italian columns), from the web repo's Sheet
 * logger: canale, servizio, pagina, nome, telefono, origine, note.
 *
 * Known limitation: `origine` packs utm_source/utm_campaign/source into one
 * joined string, so per-UTM fields cannot be recovered reliably and are left
 * null rather than guessed. Add a `created_at`/timestamp column to the mapping
 * if the export includes one.
 */
export const VCF_SHEET_MAPPING: LeadLogMapping = {
  columns: {
    channel: "canale",
    service: "servizio",
    page: "pagina",
    name: "nome",
    phone: "telefono",
  },
  formValue: "form",
  clickValues: ["whatsapp", "call"],
};

export const MAPPING_PRESETS: Record<string, LeadLogMapping> = {
  identity: IDENTITY_MAPPING,
  vcf: VCF_SHEET_MAPPING,
};
