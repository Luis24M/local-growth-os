# MCP Tool Contract

## Goal

Expose read-only growth intelligence to Claude/Codex through MCP tools. The
tools should answer business questions without requiring the model to know SQL,
API details, or client-specific mappings.

## Default Safety

MVP tools are read-only.

Any tool that mutates CRM, Ads, Sheets, or website repositories must be in a
separate package and disabled by default.

## Proposed Tools

### get_growth_snapshot

Returns top-line metrics for a date range.

Input:

```json
{
  "client_id": "vivicasafacile",
  "date_from": "2026-06-01",
  "date_to": "2026-06-30"
}
```

Output:

- leads
- qualified leads
- won opportunities
- cost
- cost per lead
- top services
- top cities
- warnings

### get_funnel

Returns funnel from sessions to events to leads to opportunities.

Dimensions:

- channel
- service
- city
- landing page

### get_leads_by_service

Returns lead counts, quality score, and opportunity stage by service.

### get_leads_by_city

Returns lead counts and SEO demand by city.

### get_ad_performance

Returns Google Ads or Meta Ads performance joined with lead quality.

MVP can return a clear "not configured" status if Ads is not connected.

### get_seo_opportunities

Returns ranked query/page opportunities from Search Console.

Useful filters:

- service
- city
- min impressions
- max average position
- include existing pages
- include missing pages

### get_content_backlog

Returns prioritized pages/blog/tools to create.

Each item should include:

- title
- target keyword
- service
- city
- intent
- page type
- internal links
- CTA
- expected business impact

### get_workflow_risks

Returns GoHighLevel workflow risks from CRM exports and optional internal
workflow audit outputs.

Risk categories:

- draft generic workflow
- legacy/copy workflow
- orphan email campaign
- missing trigger
- duplicated message path
- hardcoded copy
- missing custom value
- missing stop condition

### generate_weekly_report

Returns a Markdown report using `templates/weekly-growth-report.md`.

### generate_seo_brief

Returns a Markdown content brief using `templates/seo-brief.md`.

## Error Model

Every tool must return structured errors.

Examples:

```json
{
  "ok": false,
  "error": {
    "code": "SOURCE_NOT_CONFIGURED",
    "message": "Google Ads is not configured for this client.",
    "next_step": "Set GOOGLE_ADS_CUSTOMER_ID and OAuth credentials in local env."
  }
}
```

## Tool Implementation Order

1. `get_growth_snapshot`
2. `get_seo_opportunities`
3. `generate_weekly_report`
4. `get_workflow_risks`
5. `get_ad_performance`
6. `generate_seo_brief`

