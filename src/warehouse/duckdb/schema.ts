/**
 * DuckDB DDL for the Local Growth OS local warehouse.
 *
 * Tables follow docs/data-model.md. This is the zero-cost MVP warehouse; the
 * BigQuery pack (Ticket 004) mirrors these shapes later. Nothing here is
 * client-specific — every table carries `client_id` so one warehouse file can
 * hold a single client and the same schema is reused for every client.
 */

/** Dimension and fact tables. Created idempotently. */
export const DDL = /* sql */ `
-- Dimensions -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dim_client (
  client_id   VARCHAR,
  client_name VARCHAR,
  domain      VARCHAR,
  timezone    VARCHAR,
  currency    VARCHAR
);

CREATE TABLE IF NOT EXISTS dim_service (
  service_id   VARCHAR,
  client_id    VARCHAR,
  service_name VARCHAR,
  is_active    BOOLEAN,
  margin_tier  VARCHAR,
  priority     INTEGER
);

CREATE TABLE IF NOT EXISTS dim_city (
  city_id   VARCHAR,
  client_id VARCHAR,
  city_name VARCHAR,
  region    VARCHAR,
  priority  INTEGER
);

CREATE TABLE IF NOT EXISTS dim_page (
  page_id    VARCHAR,
  client_id  VARCHAR,
  path       VARCHAR,
  page_type  VARCHAR,
  service_id VARCHAR,
  city_id    VARCHAR
);

-- Facts ----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fact_lead (
  lead_id            VARCHAR,
  client_id          VARCHAR,
  created_at         TIMESTAMP,
  source_system      VARCHAR,
  contact_id         VARCHAR,
  opportunity_id     VARCHAR,
  service_id         VARCHAR,
  city_id            VARCHAR,
  landing_path       VARCHAR,
  name_present       BOOLEAN,
  phone_present      BOOLEAN,
  email_present      BOOLEAN,
  utm_source         VARCHAR,
  utm_medium         VARCHAR,
  utm_campaign       VARCHAR,
  utm_content        VARCHAR,
  utm_term           VARCHAR,
  gclid_present      BOOLEAN,
  fbclid_present     BOOLEAN,
  lead_status        VARCHAR,
  opportunity_stage  VARCHAR,
  won_value          DOUBLE,
  lost_reason        VARCHAR,
  quality_score      DOUBLE
);

CREATE TABLE IF NOT EXISTS fact_event (
  event_id          VARCHAR,
  client_id         VARCHAR,
  event_at          TIMESTAMP,
  session_id        VARCHAR,
  anonymous_user_id VARCHAR,
  event_name        VARCHAR,
  page_path         VARCHAR,
  service_id        VARCHAR,
  city_id           VARCHAR,
  channel           VARCHAR
);

CREATE TABLE IF NOT EXISTS fact_ad_spend (
  date          DATE,
  client_id     VARCHAR,
  platform      VARCHAR,
  account_id    VARCHAR,
  campaign_id   VARCHAR,
  campaign_name VARCHAR,
  ad_group_name VARCHAR,
  cost          DOUBLE,
  clicks        INTEGER,
  impressions   INTEGER,
  conversions   DOUBLE
);

CREATE TABLE IF NOT EXISTS fact_search_query (
  date        DATE,
  client_id   VARCHAR,
  query       VARCHAR,
  page        VARCHAR,
  country     VARCHAR,
  device      VARCHAR,
  impressions INTEGER,
  clicks      INTEGER,
  ctr         DOUBLE,
  position    DOUBLE,
  service_id  VARCHAR,
  city_id     VARCHAR
);
`;

/** Fact tables that the generic file loader can populate from data/private/<client>/. */
export const FACT_TABLES = [
  "fact_lead",
  "fact_event",
  "fact_ad_spend",
  "fact_search_query",
] as const;

export type FactTable = (typeof FACT_TABLES)[number];
