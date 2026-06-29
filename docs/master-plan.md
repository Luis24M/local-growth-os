# Master Plan

## Mission

Build a reusable Growth OS for local service businesses. The system should turn
analytics, CRM, ads, search, and website data into concrete weekly actions that
increase revenue.

The first pilot is Vivi Casa Facile. The product is owned by Luis24M.

## Strategic Position

Most local businesses have tools but not a decision layer:

- GA4 shows traffic, not business quality.
- Search Console shows demand, not content priority.
- Google Ads shows spend, not real lead quality.
- GoHighLevel stores commercial state, but workflows and opportunities are hard
  to audit consistently.
- Google Sheets often becomes the accidental source of truth.

Local Growth OS connects these systems and creates a practical operating rhythm:

1. collect data
2. normalize it
3. detect opportunities
4. generate tickets
5. measure commercial impact

## Product Boundaries

This repository is the reusable product. Client repositories are pilot
implementations.

Reusable here:

- data contracts
- SQL schemas
- read-only connectors
- MCP tools
- report templates
- SEO opportunity scoring
- lead scoring logic
- dashboard templates

Client-specific outside this repo:

- client website code
- client raw exports
- client CRM credentials
- client Google Ads credentials
- client workflow edits
- client content PRs

## Operating Modes

### Mode 1: Read-only audit

Safe for production clients. The system reads data and writes reports only.

Allowed:

- read analytics
- read Search Console
- read Google Ads reports
- read GoHighLevel exports
- read Google Sheet rows
- generate Markdown/CSV summaries locally

Not allowed:

- mutate CRM records
- edit workflows
- send messages
- change ad campaigns
- upload conversions
- create tags, fields, opportunities, or contacts

### Mode 2: Draft generation

The system creates proposed changes, not live changes.

Allowed:

- SEO briefs
- blog outlines
- dashboard specs
- GHL workflow change proposals
- Ads negative keyword suggestions
- lead scoring proposals

### Mode 3: Approved execution

Only after human approval. Not part of MVP.

## Pilot Facts From Vivi Casa Facile

Evidence found in existing repos:

- Web captures `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`,
  `utm_term`, `gclid`, and `fbclid`.
- Web writes form leads to GoHighLevel and Google Sheet.
- Web logs WhatsApp and phone click intent to Sheet.
- Web has GA4, Meta Pixel, and Google Ads conversion env hooks.
- CRM repo documents pipelines, custom fields, tags, workflows, forms, surveys,
  funnels, calendars, users, products, and integrations.
- CRM workflow internals are not fully available through normal HighLevel API
  exports; `Luis24M/ghl-workflow-toolkit` is the right operator for internal
  workflow inspection in Claude Code.

Known data gaps:

- Search Console data not yet normalized in a warehouse.
- Google Ads cost and conversion data not yet joined to GHL lead quality.
- Offline conversions are planned but not yet implemented.
- GHL workflow internals need a read-only export pass.
- CRM docs and web docs contain some historical drift; direct API flow is the
  current web lead path.

## MVP Goal

Produce one weekly report that answers:

- Which services generated leads?
- Which cities generated leads or demand?
- Which pages generated leads?
- Which Search Console queries should become pages or blog posts?
- Which campaigns or sources look low quality?
- Which leads are likely high priority?
- Which GHL workflow risks should be reviewed?

## MVP Inputs

1. Google Sheet lead log.
2. GA4 / BigQuery event export.
3. Search Console query/page data.
4. Google Ads campaign cost data.
5. GoHighLevel contacts/opportunities export.
6. Static website/service map from client repo.

## MVP Outputs

1. Weekly Markdown report.
2. SEO content backlog.
3. Lead quality table.
4. Source/campaign performance table.
5. GHL risk report.
6. Claude build tickets for client implementation.

## North Star Metrics

- Qualified leads per week.
- Cost per qualified lead.
- Won revenue per source.
- Organic non-brand impressions by city/service.
- Visitor to lead conversion rate.
- Lead response time.
- Opportunity stage progression.

## 30-Day Roadmap

Week 1:

- create docs and repo skeleton
- define warehouse schema
- define MCP contracts
- build Sheet importer MVP
- build Search Console export/import spec

Week 2:

- create BigQuery dataset or DuckDB fallback
- load pilot data from Sheet/GSC exports
- create first weekly report generator
- create first SEO opportunity scoring

Week 3:

- add GA4 events
- join landing page sessions to leads
- add lead source normalization
- create Looker Studio dashboard spec

Week 4:

- add Google Ads cost import
- define offline conversion payload
- create first lead scoring heuristic
- prepare GHL workflow audit runbook using `ghl-workflow-toolkit`

## Success Criteria

The MVP is successful when a weekly report can produce at least:

- 5 prioritized SEO/content actions
- 3 conversion or tracking issues
- 3 CRM/workflow risks
- source/channel performance by lead quality
- a clear next-week action plan

