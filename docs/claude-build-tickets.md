# Claude Build Tickets

These tickets are written for Claude Code as the builder. Do not let Claude
change architecture without approval.

Global rules:

- no co-authored commits
- public repo, no secrets
- no `.env` commits
- read-only first
- write clear README/docs
- prefer small PRs
- validate before push

## Ticket 001: Repo Hygiene Baseline

Goal:

Set up the public repository so it is safe to build in.

Tasks:

- keep `.env.example` current
- keep `.gitignore` blocking raw/private data
- keep Gitleaks workflow passing
- add basic contribution rules if code is introduced

Acceptance:

- `git status` clean
- Gitleaks passes on PR
- README explains ownership and safety

## Ticket 002: Client Config Loader

Goal:

Implement a config loader that reads `clients/<client>/config.example.yml` style
files and validates required fields.

Constraints:

- no secrets in config
- use env vars for credentials
- fail closed when a source is not configured

Acceptance:

- validates sample VCF config
- rejects missing `client_id`
- rejects unknown source types
- unit tests included

## Ticket 003: DuckDB MVP Warehouse

Goal:

Build zero-cost local warehouse MVP before BigQuery.

Tasks:

- create `/src/warehouse/duckdb` module
- load CSV/JSON exports from `data/private/<client>/`
- create tables matching `docs/data-model.md`
- write `mart_seo_opportunities`

Acceptance:

- no private data committed
- sample public fixtures pass
- README explains how to run locally

## Ticket 004: BigQuery Schema Pack

Goal:

Create SQL DDL for BigQuery tables and marts.

Tasks:

- partition fact tables by date
- cluster by `client_id`, `service_id`, `city_id`
- include cost guardrail notes
- no deployment automation yet

Acceptance:

- SQL files in `sql/bigquery/`
- dry-run instructions documented
- no credentials required

## Ticket 005: Search Console Import

Goal:

Import Search Console query/page data into the warehouse.

Mode:

- read-only
- local OAuth or exported CSV first

Acceptance:

- supports CSV import first
- normalizes query, page, clicks, impressions, ctr, position
- maps service/city by configurable rules
- produces SEO opportunity table

## Ticket 006: Sheet Lead Log Import

Goal:

Import web lead/click log from Google Sheets or exported CSV.

Acceptance:

- supports CSV import first
- normalizes form leads and click intent rows
- preserves UTM fields
- marks click events as intent, not confirmed message sends

## Ticket 007: GHL Read-Only Import

Goal:

Import GoHighLevel contacts/opportunities export.

Important:

Use existing CRM repo exports first. Do not require live GHL credentials for the
MVP.

Acceptance:

- reads sanitized JSON exports
- maps opportunities to stages
- computes lead quality features
- never mutates GHL

## Ticket 008: Weekly Growth Report

Goal:

Generate `reports/<client>/weekly/YYYY-MM-DD.md`.

Sections:

- executive summary
- leads by source/service/city
- SEO opportunities
- campaign issues
- CRM/workflow risks
- next-week actions

Acceptance:

- uses `templates/weekly-growth-report.md`
- output is deterministic
- no PII in default report

## Ticket 009: MCP Read-Only Server

Goal:

Expose first read-only MCP tools.

Tools:

- `get_growth_snapshot`
- `get_seo_opportunities`
- `generate_weekly_report`

Acceptance:

- stdio transport
- no write tools
- structured errors
- config-driven client selection

## Ticket 010: VCF SEO Backlog

Goal:

Generate first content backlog for Vivi Casa Facile.

Inputs:

- existing services
- existing blog URLs
- Search Console export when available
- fallback manual clusters from `clients/vivicasafacile/source-map.md`

Acceptance:

- 20 prioritized content ideas
- each has intent, page type, CTA, schema, internal links
- no fake search volume unless marked as estimate

## Ticket 011: GHL Workflow Internal Audit Prompt

Goal:

Create a ready-to-run Claude Code prompt that uses
`Luis24M/ghl-workflow-toolkit` in read-only mode.

Acceptance:

- explicit forbidden write tools
- output paths
- redaction rules
- priority workflow list
- rollback note for future write phase

