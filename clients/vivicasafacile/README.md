# Client Pilot: Vivi Casa Facile

Vivi Casa Facile is the first pilot client for Local Growth OS.

This directory contains only public-safe configuration, source maps, and notes.
Do not commit credentials, raw exports, customer data, webhook URLs, or private
CRM payloads here.

## Business Context

- Local service business in Liguria, Italy.
- Core services: moving, clear-outs, painting, cleaning, utilities, internet,
  insurance.
- Website stack: Astro + Vercel.
- CRM: SQUADD / GoHighLevel.
- Current lead flow: website form writes to GoHighLevel and Google Sheet.
- Current click tracking: WhatsApp and phone click intent written to Sheet.

## Useful Source Repos

These are local/source repos, not dependencies of this public repo:

- `vivicasafacile`: CRM documentation and exports.
- `vivicasafacile-web`: website, tracking, API, SEO, blog, lead forms.
- `Luis24M/ghl-workflow-toolkit`: Claude Code plugin for GoHighLevel workflow
  operations and audit.

## Pilot Questions

The first weekly report should answer:

- Which services generated the most leads?
- Which city/service clusters have SEO demand?
- Which pages convert or fail to convert?
- Which channels generate qualified leads?
- Which GHL workflows need audit before automation changes?
- Which blog/tool pages should be created next?

## Readiness

Available:

- website tracking code
- UTM/gclid/fbclid capture
- Sheet logging path
- CRM metadata exports
- blog and landing page structure
- Google Ads setup guide
- GHL workflow audit prompt

Missing or to confirm:

- Search Console export/access
- GA4 BigQuery export/access
- Google Ads account access and conversion labels
- Google Business Profile data
- Meta Ads data
- current GHL workflow internals via toolkit

