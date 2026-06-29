# Data Directory

This directory holds local working data. **Almost everything here is git-ignored.**

## Layout

```text
data/
  private/<client>/   # sanitized client exports you load locally (IGNORED)
    fact_search_query.csv   # or .json — Search Console export
    fact_lead.json          # or .csv — lead/click log
    fact_event.csv          # website events
    fact_ad_spend.csv       # campaign cost
    warehouse.duckdb        # built warehouse, if persisted
  raw/                # raw, untouched source exports (IGNORED)
```

- `data/private/<client>/` and `data/raw/` are blocked by `.gitignore`.
- CSV, JSON Lines, Parquet, SQLite, DuckDB, and spreadsheet files are ignored
  repo-wide.
- Never force-add (`git add -f`) anything under these paths.

## Warehouse File Convention

The DuckDB loader (`src/warehouse/duckdb/`) looks for one file per fact table,
named exactly after the table (`<table>.csv` preferred, then `<table>.json`).
Only columns shared with the table schema are loaded; `client_id` is set from
the client config, not the file. Build with `npm run build-warehouse -- <client>`.

## Public Fixtures

Public, fake, or fully sanitized sample data used by tests and examples does
**not** live here. Put it in:

- `tests/fixtures/` — fixtures consumed by automated tests
- `examples/` — illustrative sample outputs

Those paths are explicitly allowed in `.gitignore` so connectors can ship with
safe, reproducible sample data.

See [`../docs/security.md`](../docs/security.md) for the full data-handling and
privacy-level policy.
