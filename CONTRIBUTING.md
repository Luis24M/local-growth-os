# Contributing

Local Growth OS is a **public** repository. Treat every change as if competitors,
clients, and automated scanners will read it. The rules below keep the repo safe
to build in.

## Golden Rules

- Public repo, **no secrets**. See [`docs/security.md`](docs/security.md).
- Never commit `.env`, real credentials, tokens, webhook URLs, location IDs, raw
  exports, or customer PII (names, emails, phones).
- Use `.env.example` with empty placeholders only.
- Read-only first. Any write action against GoHighLevel, Google Ads, or a CRM
  needs explicit human approval.
- Reusable product code lives here. Client-specific code stays in the client
  repos (see [`README.md`](README.md#ownership-rules)).

## Branches, Commits, PRs

- One small branch per ticket: `ticket-<id>-<short-slug>`.
- Implement only the scope of the ticket.
- Short commit messages. **No `Co-authored-by` trailers.**
- Small PRs targeting `main`. Every PR must describe how it was validated.

## Where Data Goes

- Private/raw client data: `data/private/<client>/` and `data/raw/` — both are
  git-ignored. Never force-add files there.
- Public, fake, or sanitized fixtures: `tests/fixtures/` and `examples/`. These
  are allowed in git even though `*.csv`, `*.jsonl`, etc. are ignored elsewhere.
- Generated reports may contain Level 1/2 data and must not be committed.

## Pre-Commit Checklist

Before every commit:

1. Review the diff: `git diff --staged`.
2. Run the preflight guard: `scripts/preflight.sh`.
3. Run any available tests/checks for the code you touched.
4. Confirm no secrets, raw exports, or PII are staged.

The Secret Scan GitHub Action (Gitleaks) runs on every push and PR as a backstop.
It is not a license to be careless — the local checklist comes first.
