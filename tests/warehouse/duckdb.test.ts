import { afterEach, describe, expect, it } from "vitest";
import { parseClientConfig, type ClientConfig } from "../../src/config/index.js";
import { buildWarehouse, getSeoOpportunities, Warehouse } from "../../src/warehouse/duckdb/index.js";

const FIXTURE_DIR = "tests/fixtures/warehouse/democo";

/** A generic fake client — deliberately not Vivi Casa Facile (reusability check). */
function democoConfig(clientId = "democo"): ClientConfig {
  return parseClientConfig({
    client_id: clientId,
    client_name: "Demo Co",
    domain: "https://www.democo.example",
    timezone: "UTC",
    currency: "USD",
    sources: {},
    services: [
      { id: "cleaning", name: "Cleaning", active: true, priority: 1, margin_tier: "high" },
      { id: "painting", name: "Painting", active: true, priority: 2, margin_tier: "medium" },
    ],
    cities: [
      { id: "springfield", name: "Springfield", priority: 1 },
      { id: "shelbyville", name: "Shelbyville", priority: 2 },
    ],
  });
}

let open: Warehouse[] = [];
async function build(config: ClientConfig, dataDir = FIXTURE_DIR) {
  const { warehouse, loaded } = await buildWarehouse(config, { dataDir });
  open.push(warehouse);
  return { warehouse, loaded };
}

afterEach(async () => {
  await Promise.all(open.map((w) => w.close()));
  open = [];
});

describe("warehouse build", () => {
  it("seeds dimensions from the config", async () => {
    const { warehouse } = await build(democoConfig());
    expect((await warehouse.all("SELECT * FROM dim_client"))[0]).toMatchObject({
      client_id: "democo",
      currency: "USD",
    });
    expect(await warehouse.all("SELECT * FROM dim_service")).toHaveLength(2);
    expect(await warehouse.all("SELECT * FROM dim_city")).toHaveLength(2);
  });

  it("loads CSV and JSON fact files and stamps client_id from config", async () => {
    const { warehouse, loaded } = await build(democoConfig());
    const tables = loaded.map((l) => l.table).sort();
    expect(tables).toEqual(["fact_lead", "fact_search_query"]);

    const sq = await warehouse.all("SELECT COUNT(*) AS n FROM fact_search_query");
    expect(sq[0]?.n).toBe(6);
    const leads = await warehouse.all("SELECT COUNT(*) AS n FROM fact_lead");
    expect(leads[0]?.n).toBe(2);

    // client_id comes from config, never the file (files contain no client_id column).
    const stray = await warehouse.all(
      "SELECT COUNT(*) AS n FROM fact_search_query WHERE client_id <> 'democo'",
    );
    expect(stray[0]?.n).toBe(0);
  });
});

describe("mart_seo_opportunities", () => {
  it("aggregates, scores, and ranks deterministically", async () => {
    const { warehouse } = await build(democoConfig());
    const rows = await getSeoOpportunities(warehouse);

    // 5 distinct query/page groups (the two cleaning-springfield rows aggregate).
    expect(rows).toHaveLength(5);

    const top = rows[0]!;
    expect(top.query).toBe("cleaning springfield");
    expect(top.impressions).toBe(1200);
    expect(top.clicks).toBe(9);
    expect(top.ctr as number).toBeCloseTo(0.0075, 4);
    expect(top.avg_position as number).toBeCloseTo(7.67, 2);
    expect(top.low_ctr_weight as number).toBeCloseTo(1.5, 4);
    expect(top.cannibalization_penalty as number).toBeCloseTo(0, 4);
    // 7.0909 (imp) + 2.0 (pos) + 2.0 (city) + 1.5 (margin) + 1.5 (low ctr)
    expect(top.score as number).toBeCloseTo(14.0909, 3);

    // scores are non-increasing (ranked)
    const scores = rows.map((r) => r.score as number);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it("penalizes cannibalization when one query has multiple pages", async () => {
    const { warehouse } = await build(democoConfig());
    const rows = await getSeoOpportunities(warehouse);
    const cannibal = rows.filter((r) => r.query === "cleaning service");
    expect(cannibal).toHaveLength(2);
    for (const r of cannibal) {
      expect(r.pages_per_query).toBe(2);
      expect(r.cannibalization_penalty as number).toBeCloseTo(0.5, 4);
    }
  });

  it("gives weak position weight to results past the striking-distance window", async () => {
    const { warehouse } = await build(democoConfig());
    const rows = await getSeoOpportunities(warehouse);
    const tips = rows.find((r) => r.query === "painting tips")!;
    expect(tips.avg_position as number).toBeCloseTo(25, 2);
    expect(tips.position_weight as number).toBeCloseTo(0.8, 4);
  });

  it("is reusable: a different client with no data builds empty facts and mart", async () => {
    const { warehouse, loaded } = await build(democoConfig("otherco"), "tests/fixtures/warehouse/__none__");
    expect(loaded).toHaveLength(0);
    expect(await warehouse.all("SELECT * FROM dim_client")).toHaveLength(1);
    expect(await getSeoOpportunities(warehouse)).toHaveLength(0);
  });

  it("produces identical output on rebuild (determinism)", async () => {
    const a = await build(democoConfig());
    const b = await build(democoConfig());
    expect(await getSeoOpportunities(a.warehouse)).toEqual(
      await getSeoOpportunities(b.warehouse),
    );
  });
});
