# Local Growth OS

Reusable growth, analytics, SEO, and automation operating system for local service
businesses.

The first pilot client is Vivi Casa Facile, but this repository belongs to
Luis24M and is designed to become a reusable product. Client-specific secrets,
API keys, webhook URLs, raw exports, phone lists, and private customer data do
not belong in this repository.

## What This Repo Is

Local Growth OS is a lightweight system for turning scattered growth data into
decisions:

- which city/service pages to build next
- which campaigns are producing good leads
- which leads should be prioritized
- which CRM workflows are risky or duplicated
- which SEO queries deserve content
- which weekly actions should be assigned to the operator

## Initial Scope

Version 0 is documentation-first:

- master plan for Claude Code builders
- data model and warehouse plan
- MCP tool contract
- SEO opportunity engine spec
- GoHighLevel safety rules
- Vivi Casa Facile pilot configuration without secrets
- implementation tickets with acceptance criteria

## Ownership Rules

Reusable product code goes here:

- MCP servers
- connectors
- warehouse schemas
- dashboard templates
- SEO/content engines
- lead scoring logic
- reporting templates

Client code stays in the client repos:

- website tracking changes
- client landing pages
- client-specific CRM mappings
- client-specific workflow changes
- content written specifically for the client

## Current Pilot Evidence

The Vivi Casa Facile repos already contain useful source material:

- `vivicasafacile` CRM repo:
  - CRM inventory exports and generated docs
  - 40 workflows documented at metadata level
  - pipeline, custom field, tag, form, funnel, calendar, user, product exports
  - GoHighLevel workflow audit plan using `Luis24M/ghl-workflow-toolkit`
- `vivicasafacile-web`:
  - GA4, Meta Pixel, Google Ads conversion env hooks
  - direct `/api/lead` integration into GoHighLevel plus Google Sheet logging
  - `/api/track` click logging for WhatsApp and phone clicks
  - UTM, `gclid`, and `fbclid` capture
  - SEO/blog/landing infrastructure
  - simulator logic and lead form events

This repo should consume those facts as inputs, not duplicate secrets or raw
private data.

## Recommended Architecture

```text
Data sources
  GA4 / BigQuery export
  Google Search Console
  Google Ads
  Google Sheets lead log
  GoHighLevel / Squadd exports
  Website event schema

Warehouse
  BigQuery if free-tier usage is enough
  DuckDB + Parquet fallback if cost becomes an issue

Intelligence layer
  SEO opportunity engine
  weekly growth report
  lead quality scoring
  CRM workflow risk audit

Interface
  read-only MCP tools
  Markdown reports
  Looker Studio dashboards
```

## Cost Principle

Start with the lowest-cost reliable setup.

BigQuery can be used at the beginning if the project remains inside the free
tier: Google Cloud documents 10 GiB storage and 1 TiB queries per month in the
free tier. GA4 also supports BigQuery export. Avoid streaming export and broad
unpartitioned queries until the economics are proven.

References:

- https://docs.cloud.google.com/free/docs/free-cloud-features
- https://support.google.com/analytics/answer/9358801

## Repo Map

```text
docs/
  master-plan.md
  claude-build-tickets.md
  data-model.md
  mcp-tools.md
  security.md
  warehouse-options.md
  seo-content-engine.md
clients/
  vivicasafacile/
    README.md
    config.example.yml
    source-map.md
templates/
  weekly-growth-report.md
  seo-brief.md
examples/
  vivicasafacile-weekly-report.example.md
data/
  README.md            # private/raw layout (git-ignored data)
scripts/
  preflight.sh         # local secret/data guard, run before committing
CONTRIBUTING.md        # branch/commit/PR and safety rules
```

## Development

Code is TypeScript on Node 20+.

```bash
npm install
npm run typecheck
npm test
# validate a client config (no secrets, env-var references only):
npm run validate-config -- clients/vivicasafacile/config.example.yml
```

The config loader (`src/config/`) reads `clients/<client>/config.yml` (falling
back to `config.example.yml`), validates it with a strict schema, and fails
closed: it rejects unknown source types and refuses literal credentials —
credential-bearing fields may only name an environment variable. See
`docs/data-model.md` for the dimensions a config feeds.

### Local warehouse (DuckDB MVP)

`src/warehouse/duckdb/` builds a zero-cost local DuckDB warehouse from a client
config plus CSV/JSON fact exports. No BigQuery, no credentials, no network.

Place a client's exports in its **git-ignored** data directory, named per table:

```text
data/private/<client>/
  fact_search_query.csv     # or .json
  fact_lead.json            # or .csv
  fact_event.csv
  fact_ad_spend.csv
```

Then build and inspect the SEO opportunities:

```bash
npm run build-warehouse -- <clientId> [--data <dir>] [--db <path>] [--top N]
# example against public test fixtures (no private data needed):
npm run build-warehouse -- vivicasafacile --data tests/fixtures/warehouse/democo
```

How it works:

- Dimensions (`dim_client`, `dim_service`, `dim_city`) are seeded from the
  validated config — never hardcoded to any client.
- Facts are loaded generically: only columns shared by the file and the table
  are inserted, and `client_id` is stamped from the config, never read from the
  file. Missing files are skipped.
- `mart_seo_opportunities` ranks query/page rows with a transparent, documented
  score (demand, striking-distance position, city priority, service margin, low
  CTR, minus cannibalization). No search volume is invented.
- Default DB is `:memory:`; pass `--db data/private/<client>/warehouse.duckdb`
  to persist (also git-ignored).

Public fake fixtures live in `tests/fixtures/warehouse/`.

## Non-Negotiables

- Public repo, no secrets.
- No `.env` files committed.
- No API keys, refresh tokens, webhook URLs, customer phone/email lists, or raw
  CRM exports committed.
- Use `.env.example` only.
- First versions are read-only.
- Any write action in GoHighLevel, Ads, or CRM requires explicit approval.
- Commits must be short and must not include co-author trailers.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for branch, commit, and PR rules, and
[`docs/security.md`](docs/security.md) for the no-secrets policy. Run
`scripts/preflight.sh` before every commit.

## Next Step

Give Claude Code `docs/claude-build-tickets.md` and ask it to implement tickets
in order, starting with the docs-only MVP and read-only connectors.

