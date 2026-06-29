# Security Rules

## Public Repo Policy

This repository is public. Treat it as if competitors, clients, and scanners
will read it.

Never commit:

- `.env`
- API keys
- OAuth client secrets
- OAuth refresh tokens
- GoHighLevel PITs
- Firebase refresh tokens
- webhook URLs
- Google Sheet Apps Script URLs
- service account JSON
- raw lead exports
- customer names, emails, or phone numbers
- private Ads account IDs unless explicitly approved

## Env Handling

Use `.env.example` with empty placeholders.

Real credentials live only in:

- local `.env`
- local credential manager
- GitHub Actions secrets
- deployment provider secrets
- `~/.ghl-workflow-toolkit/credentials.env` for Claude Code GHL plugin

## Data Handling

Default reports should be Level 0 public-safe:

- aggregate metrics
- no PII
- no raw IDs
- no URLs containing tokens

Operator reports can use Level 1 or Level 2 data locally, but outputs must not
be committed.

## GHL Safety

Initial mode is read-only.

Forbidden without explicit approval:

- create/update/delete workflow
- enroll/remove contacts
- send SMS/email/WhatsApp
- create/update tags
- create/update custom fields
- create/update opportunities
- change pipelines/stages
- change calendars/users

## Git Rules

- short commits
- no co-author trailers
- no generated raw exports
- no unrelated client changes
- every PR must include validation

## CI

The repo includes Gitleaks via GitHub Actions. It is a backstop, not a license
to be careless.

