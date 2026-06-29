# Warehouse Options

## Decision

Start with BigQuery if free-tier usage is sufficient. Keep a DuckDB fallback for
zero-cost local analysis.

## Option A: BigQuery

Best when:

- GA4 BigQuery export is enabled
- Looker Studio dashboards are needed
- multiple sources need scheduled joins
- data volume grows beyond local files

Cost guardrails:

- use partitioned tables by date
- use clustered tables by `client_id`, `service_id`, `city_id`
- avoid `SELECT *`
- materialize weekly marts
- avoid streaming export initially
- set query cost alerts

Relevant free-tier docs:

- Google Cloud free tier: https://docs.cloud.google.com/free/docs/free-cloud-features
- GA4 BigQuery export: https://support.google.com/analytics/answer/9358801

## Option B: DuckDB + Parquet

Best when:

- zero cloud cost is mandatory
- data volume is small
- reports can be generated locally
- scheduling is not yet important

Tradeoffs:

- no native Looker Studio integration
- harder multi-user access
- no managed auth
- good for MVP exploration

## Initial Recommendation

Use BigQuery for the pilot only if:

- a Google Cloud billing account already exists
- cost alerts are enabled
- daily data volume is small
- GA4 export is batch/daily

Otherwise:

- export Search Console and Sheet/GHL data to local Parquet
- use DuckDB for first weekly reports
- move to BigQuery after the report proves value

## Tables To Create First

```text
raw_sheet_leads
raw_gsc_search_analytics
raw_ghl_opportunities
raw_ga4_events
stg_leads
stg_search_queries
stg_events
mart_weekly_growth
mart_seo_opportunities
```

