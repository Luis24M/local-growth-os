# Data Model

## Principles

- One row per business event where possible.
- Preserve source timestamps.
- Never store raw secrets.
- Hash or redact personal data when reports do not need identity.
- Keep client-specific mappings in `clients/<client>/`.
- Separate facts from dimensions.

## Core Dimensions

### dim_client

| column | type | notes |
|---|---|---|
| client_id | string | stable internal id |
| client_name | string | display name |
| domain | string | canonical domain |
| timezone | string | business timezone |
| currency | string | ISO currency |

### dim_service

| column | type | notes |
|---|---|---|
| service_id | string | normalized slug |
| client_id | string | owner |
| service_name | string | public label |
| is_active | boolean | sellable now |
| margin_tier | string | low/medium/high if known |

### dim_city

| column | type | notes |
|---|---|---|
| city_id | string | normalized slug |
| client_id | string | owner |
| city_name | string | public label |
| region | string | region/province |
| priority | integer | commercial priority |

### dim_page

| column | type | notes |
|---|---|---|
| page_id | string | URL path hash or slug |
| client_id | string | owner |
| path | string | URL path |
| page_type | string | home/lp/blog/tool/legal |
| service_id | string | nullable |
| city_id | string | nullable |

## Core Facts

### fact_lead

One row per submitted lead or manually imported CRM lead.

| column | type | notes |
|---|---|---|
| lead_id | string | internal stable id |
| client_id | string | owner |
| created_at | timestamp | source created time |
| source_system | string | web/ghl/sheet/meta |
| contact_id | string | CRM contact id if available |
| opportunity_id | string | CRM opportunity id if available |
| service_id | string | normalized service |
| city_id | string | inferred or submitted |
| landing_path | string | page that generated the lead |
| name_present | boolean | do not store name unless needed |
| phone_present | boolean | do not store phone unless needed |
| email_present | boolean | do not store email unless needed |
| utm_source | string | raw UTM |
| utm_medium | string | raw UTM |
| utm_campaign | string | raw UTM |
| utm_content | string | raw UTM |
| utm_term | string | raw UTM |
| gclid_present | boolean | true if captured |
| fbclid_present | boolean | true if captured |
| lead_status | string | normalized CRM status |
| opportunity_stage | string | current stage |
| won_value | numeric | if available |
| lost_reason | string | if available |
| quality_score | numeric | computed later |

### fact_event

One row per important website event.

| column | type | notes |
|---|---|---|
| event_id | string | source event id |
| client_id | string | owner |
| event_at | timestamp | event time |
| session_id | string | GA/session id if available |
| anonymous_user_id | string | hashed or platform id |
| event_name | string | lead_submit/call_click/etc |
| page_path | string | URL path |
| service_id | string | inferred |
| city_id | string | inferred |
| channel | string | whatsapp/call/form/scroll |

### fact_ad_spend

| column | type | notes |
|---|---|---|
| date | date | report date |
| client_id | string | owner |
| platform | string | google_ads/meta_ads |
| account_id | string | masked if public report |
| campaign_id | string | platform id |
| campaign_name | string | display name |
| ad_group_name | string | nullable |
| cost | numeric | currency unit |
| clicks | integer | platform clicks |
| impressions | integer | platform impressions |
| conversions | numeric | platform conversions |

### fact_search_query

From Search Console.

| column | type | notes |
|---|---|---|
| date | date | report date |
| client_id | string | owner |
| query | string | search query |
| page | string | landing page |
| country | string | ISO country |
| device | string | desktop/mobile/tablet |
| impressions | integer | GSC impressions |
| clicks | integer | GSC clicks |
| ctr | numeric | click-through rate |
| position | numeric | average position |
| service_id | string | inferred |
| city_id | string | inferred |

## Derived Tables

### mart_weekly_growth

Aggregates all key metrics by week, service, city, and channel.

### mart_seo_opportunities

Ranks query/page opportunities.

Suggested score:

```text
score =
  impressions_weight
  + position_window_weight
  + city_priority_weight
  + service_margin_weight
  + low_ctr_weight
  - cannibalization_penalty
```

### mart_lead_quality

Combines CRM stage, response, service, city, and source.

Suggested first heuristic:

```text
quality_score =
  service_priority
  + city_priority
  + urgency_weight
  + has_phone_weight
  + has_message_weight
  + source_quality_prior
  + crm_stage_weight
```

## Privacy Levels

Level 0 public:

- no PII
- no account IDs
- no raw webhook URLs
- aggregated metrics only

Level 1 internal:

- account IDs allowed
- no customer PII
- hashed contact ids

Level 2 operator:

- limited PII allowed when needed to operate leads
- never commit to git

