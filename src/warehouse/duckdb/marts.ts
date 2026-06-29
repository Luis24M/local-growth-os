import type { Row, Warehouse } from "./warehouse.js";

/**
 * mart_seo_opportunities — ranks query/page opportunities from fact_search_query.
 *
 * Implements the scoring sketch in docs/data-model.md with explicit, documented
 * weights so the output is transparent and deterministic:
 *
 *   score = impressions_weight   -- demand, log-scaled
 *         + position_weight      -- striking-distance bonus (avg pos 4..20)
 *         + city_weight          -- commercial city priority (dim_city)
 *         + margin_weight        -- service margin tier (dim_service)
 *         + low_ctr_weight       -- high-impression, low-CTR underperformers
 *         - cannibalization_penalty  -- multiple pages competing for one query
 *
 * Weights are intentionally simple and easy to tune later. No search volume is
 * invented: every input comes from the loaded fact rows.
 */
export const MART_SEO_OPPORTUNITIES_SQL = /* sql */ `
DROP TABLE IF EXISTS mart_seo_opportunities;
CREATE TABLE mart_seo_opportunities AS
WITH agg AS (
  SELECT
    client_id, query, page, service_id, city_id,
    SUM(impressions) AS impressions,
    SUM(clicks) AS clicks,
    CASE WHEN SUM(impressions) > 0 THEN SUM(clicks)::DOUBLE / SUM(impressions) ELSE 0 END AS ctr,
    CASE WHEN SUM(impressions) > 0 THEN SUM(position * impressions) / SUM(impressions) ELSE NULL END AS avg_position
  FROM fact_search_query
  GROUP BY client_id, query, page, service_id, city_id
),
cannib AS (
  SELECT client_id, query, COUNT(DISTINCT page) AS pages_per_query
  FROM agg GROUP BY client_id, query
),
scored AS (
  SELECT
    a.client_id, a.query, a.page, a.service_id, a.city_id,
    a.impressions, a.clicks, a.ctr, a.avg_position,
    c.pages_per_query,
    LN(1 + a.impressions) AS impressions_weight,
    CASE
      WHEN a.avg_position IS NULL THEN 0.0
      WHEN a.avg_position < 4 THEN 0.5
      WHEN a.avg_position <= 20 THEN 2.0
      ELSE 0.8
    END AS position_weight,
    2.0 / COALESCE(ci.priority, 3) AS city_weight,
    CASE s.margin_tier
      WHEN 'high' THEN 1.5 WHEN 'medium' THEN 1.0 WHEN 'low' THEN 0.5 ELSE 0.8
    END AS margin_weight,
    CASE WHEN a.ctr < 0.02 AND a.impressions >= 50 THEN 1.5 ELSE 0.0 END AS low_ctr_weight,
    GREATEST(c.pages_per_query - 1, 0) * 0.5 AS cannibalization_penalty
  FROM agg a
  JOIN cannib c USING (client_id, query)
  LEFT JOIN dim_service s ON s.client_id = a.client_id AND s.service_id = a.service_id
  LEFT JOIN dim_city ci ON ci.client_id = a.client_id AND ci.city_id = a.city_id
)
SELECT
  client_id, query, page, service_id, city_id,
  impressions, clicks,
  ROUND(ctr, 4) AS ctr,
  ROUND(avg_position, 2) AS avg_position,
  pages_per_query,
  ROUND(impressions_weight, 4) AS impressions_weight,
  ROUND(position_weight, 4) AS position_weight,
  ROUND(city_weight, 4) AS city_weight,
  ROUND(margin_weight, 4) AS margin_weight,
  ROUND(low_ctr_weight, 4) AS low_ctr_weight,
  ROUND(cannibalization_penalty, 4) AS cannibalization_penalty,
  ROUND(
    impressions_weight + position_weight + city_weight + margin_weight
    + low_ctr_weight - cannibalization_penalty,
  4) AS score
FROM scored
ORDER BY score DESC, query ASC, page ASC;
`;

/** Build all marts. Currently just the SEO opportunities mart. */
export async function buildMarts(wh: Warehouse): Promise<void> {
  await wh.exec(MART_SEO_OPPORTUNITIES_SQL);
}

/** Read the top SEO opportunities (all rows by default). */
export async function getSeoOpportunities(wh: Warehouse, limit?: number): Promise<Row[]> {
  const tail = limit && limit > 0 ? ` LIMIT ${Math.floor(limit)}` : "";
  return wh.all(`SELECT * FROM mart_seo_opportunities ORDER BY score DESC, query, page${tail};`);
}
