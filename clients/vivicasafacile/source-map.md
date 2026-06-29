# Vivi Casa Facile Source Map

## CRM Repo

Repo: `vivicasafacile`

Relevant paths:

- `README.md`: CRM inventory summary.
- `docs/02-pipelines.md`: pipeline and stage map.
- `docs/03-custom-fields.md`: custom field inventory.
- `docs/04-workflows.md`: workflow metadata.
- `docs/09-tags.md`: tag inventory.
- `docs/10-integrations.md`: inferred integrations.
- `docs/WORKFLOW_AUDIT_WITH_GHL_TOOLKIT.md`: safe read-only audit prompt.
- `docs/cross-reference/lead-flow.md`: inferred lead flow.
- `data/raw/`: raw CRM exports. Do not copy into this public repo.

Important notes:

- Normal HighLevel API metadata does not expose full workflow internals.
- Use `Luis24M/ghl-workflow-toolkit` in Claude Code for internal workflow audit.
- First pass must be read-only.

## Web Repo

Repo: `vivicasafacile-web`

Relevant paths:

- `README.md`: current web architecture and lead flow.
- `src/pages/api/lead.ts`: direct GoHighLevel lead creation and Sheet logging.
- `src/pages/api/track.ts`: WhatsApp/phone click intent logging.
- `src/components/MetaPixel.astro`: GA4, Google Ads, Meta event dispatch.
- `src/components/LeadForm.astro`: UTM/gclid/fbclid capture and form events.
- `src/pages/lp/traslochi.astro`: standalone LP form and simulator path.
- `src/content/blog/`: existing blog content.
- `src/data/services.ts`: service map.
- `src/data/routes.ts`: route/city content.
- `docs/GUIA-GOOGLE-ADS.md`: Ads setup guide.
- `docs/PROPUESTA-FORM-ADS-SEO.md`: form/ads/SEO plan.

Sensitive caution:

- Some historical docs may contain webhook URLs or operational details. Do not
  copy those values into this public repo.

## GHL Toolkit

Repo: `Luis24M/ghl-workflow-toolkit`

Use for:

- workflow internal audit
- canonical workflow action schemas
- API quirks reference
- Claude Code GHL operations

Do not use it for:

- analytics warehouse
- long-term dashboards
- SEO opportunity engine

Local Growth OS should integrate with outputs from this toolkit, not duplicate
it.

