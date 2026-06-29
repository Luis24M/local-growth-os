import { z } from "zod";

/**
 * Client config schema for Local Growth OS.
 *
 * Design rules (see docs/security.md and docs/claude-build-tickets.md#ticket-002):
 * - No secrets in config. Credential-bearing fields only reference ENV VAR NAMES
 *   (e.g. `property_id_env: GA4_PROPERTY_ID`), never literal ids or tokens.
 * - Unknown source types are rejected (`.strict()` on the sources block).
 * - Source blocks declare their required env references up front, so a declared
 *   source is always complete by shape; `enabled` only toggles activation.
 */

/** An UPPER_SNAKE_CASE environment variable name — never a literal value. */
export const envVarName = z
  .string()
  .regex(
    /^[A-Z][A-Z0-9_]*$/,
    "must be an ENV_VAR name (UPPER_SNAKE_CASE), not a literal value — no secrets in config",
  );

/** A lowercase, hyphen-separated slug. */
const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be a lowercase slug (a-z, 0-9, hyphens)");

/** IANA timezone like `Europe/Rome`, or `UTC`. */
const timezone = z
  .string()
  .regex(
    /^(UTC|[A-Za-z]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?)$/,
    "must be an IANA timezone (e.g. Europe/Rome) or UTC",
  );

/** ISO 4217 currency code. */
const currency = z.string().regex(/^[A-Z]{3}$/, "must be a 3-letter ISO 4217 code (e.g. EUR)");

/** The source types Local Growth OS knows how to ingest. */
export const SOURCE_TYPES = [
  "ga4",
  "search_console",
  "google_ads",
  "ghl",
  "sheet_lead_log",
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

const ga4Source = z
  .object({
    enabled: z.boolean(),
    property_id_env: envVarName,
    bigquery_dataset_env: envVarName.optional(),
  })
  .strict();

const searchConsoleSource = z
  .object({
    enabled: z.boolean(),
    site_url_env: envVarName,
  })
  .strict();

const googleAdsSource = z
  .object({
    enabled: z.boolean(),
    customer_id_env: envVarName,
  })
  .strict();

const ghlSource = z
  .object({
    enabled: z.boolean(),
    location_id_env: envVarName,
  })
  .strict();

const sheetLeadLogSource = z
  .object({
    enabled: z.boolean(),
    sheet_id_env: envVarName,
  })
  .strict();

/**
 * Maps each source type to the config fields that name its required env vars.
 * Used by the loader to fail closed when an enabled source's env var is unset.
 */
export const SOURCE_ENV_FIELDS: Record<SourceType, readonly string[]> = {
  ga4: ["property_id_env"],
  search_console: ["site_url_env"],
  google_ads: ["customer_id_env"],
  ghl: ["location_id_env"],
  sheet_lead_log: ["sheet_id_env"],
};

const sourcesSchema = z
  .object({
    ga4: ga4Source.optional(),
    search_console: searchConsoleSource.optional(),
    google_ads: googleAdsSource.optional(),
    ghl: ghlSource.optional(),
    sheet_lead_log: sheetLeadLogSource.optional(),
  })
  .strict();

const serviceSchema = z
  .object({
    id: slug,
    name: z.string().min(1),
    active: z.boolean(),
    priority: z.number().int().positive(),
    margin_tier: z.enum(["low", "medium", "high"]).optional(),
  })
  .strict();

const citySchema = z
  .object({
    id: slug,
    name: z.string().min(1),
    priority: z.number().int().positive(),
    region: z.string().min(1).optional(),
  })
  .strict();

/** Reject duplicate ids within an array of `{ id }` items. */
function uniqueIds(label: string) {
  return (items: { id: string }[], ctx: z.RefinementCtx) => {
    const seen = new Set<string>();
    for (const item of items) {
      if (seen.has(item.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate ${label} id: ${item.id}`,
        });
      }
      seen.add(item.id);
    }
  };
}

export const clientConfigSchema = z
  .object({
    client_id: slug,
    client_name: z.string().min(1),
    domain: z.string().url(),
    timezone,
    currency,
    sources: sourcesSchema,
    services: z.array(serviceSchema).min(1).superRefine(uniqueIds("service")),
    cities: z.array(citySchema).min(1).superRefine(uniqueIds("city")),
  })
  .strict();

export type ClientConfig = z.infer<typeof clientConfigSchema>;
