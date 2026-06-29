# Data Directory

This directory holds local working data. **Almost everything here is git-ignored.**

## Layout

```text
data/
  private/<client>/   # sanitized client exports you load locally (IGNORED)
  raw/                # raw, untouched source exports (IGNORED)
```

- `data/private/<client>/` and `data/raw/` are blocked by `.gitignore`.
- CSV, JSON Lines, Parquet, SQLite, and spreadsheet files are ignored repo-wide.
- Never force-add (`git add -f`) anything under these paths.

## Public Fixtures

Public, fake, or fully sanitized sample data used by tests and examples does
**not** live here. Put it in:

- `tests/fixtures/` — fixtures consumed by automated tests
- `examples/` — illustrative sample outputs

Those paths are explicitly allowed in `.gitignore` so connectors can ship with
safe, reproducible sample data.

See [`../docs/security.md`](../docs/security.md) for the full data-handling and
privacy-level policy.
