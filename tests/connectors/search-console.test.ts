import { afterEach, describe, expect, it } from "vitest";
import { loadClientConfig, parseClientConfig, type ClientConfig } from "../../src/config/index.js";
import { buildWarehouse, getSeoOpportunities, Warehouse } from "../../src/warehouse/duckdb/index.js";
import {
  applyMappingRules,
  defaultSeoMappingRules,
  importSearchConsoleFile,
  importSearchConsoleRows,
  normalizeSearchConsole,
  resolveHeaders,
  resolveRules,
} from "../../src/connectors/search-console/index.js";
import { readCsvRows } from "../../src/lib/csv.js";

function democoConfig(): ClientConfig {
  return parseClientConfig({
    client_id: "democo",
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
afterEach(async () => {
  await Promise.all(open.map((w) => w.close()));
  open = [];
});
async function freshWarehouse(config: ClientConfig) {
  const { warehouse } = await buildWarehouse(config, { dataDir: "tests/fixtures/__none__" });
  open.push(warehouse);
  return warehouse;
}

describe("header resolution", () => {
  it("auto-detects combined and per-dimension export headers", () => {
    expect(resolveHeaders(["Date", "Query", "Page", "Clicks", "Impressions", "CTR", "Position"]))
      .toMatchObject({ query: "Query", page: "Page", clicks: "Clicks", position: "Position" });
    expect(resolveHeaders(["Top queries", "Clicks", "Impressions", "CTR", "Position"]))
      .toMatchObject({ query: "Top queries" });
    expect(resolveHeaders(["Top pages", "Clicks", "Impressions", "CTR", "Position"]))
      .toMatchObject({ page: "Top pages" });
  });
});

describe("mapping rules", () => {
  const rules = defaultSeoMappingRules(democoConfig());

  it("derives rules from config and resolves service + city independently", () => {
    expect(applyMappingRules("cleaning springfield", "/cleaning/springfield", rules)).toEqual({
      service_id: "cleaning",
      city_id: "springfield",
    });
    expect(applyMappingRules("generic unbranded", "/blog/tips", rules)).toEqual({
      service_id: null,
      city_id: null,
    });
  });

  it("lets explicit rules take precedence over config defaults", () => {
    const merged = resolveRules(democoConfig(), [
      { pattern: "cleaning", service_id: "premium-cleaning" },
    ]);
    expect(applyMappingRules("cleaning springfield", "/x", merged).service_id).toBe(
      "premium-cleaning",
    );
  });
});

describe("normalizeSearchConsole", () => {
  it("parses metrics, maps service/city, and never invents missing values", async () => {
    const rows = await readCsvRows("tests/fixtures/search-console/gsc_query_page.csv");
    const res = normalizeSearchConsole(rows, { rules: defaultSeoMappingRules(democoConfig()) });
    expect(res.stats).toEqual({ total: 6, imported: 6, skipped: 0 });

    const first = res.rows[0]!;
    expect(first).toMatchObject({
      query: "cleaning springfield",
      page: "/cleaning/springfield",
      impressions: 800,
      clicks: 5,
      position: 8,
      service_id: "cleaning",
      city_id: "springfield",
    });
    expect(first.ctr).toBeCloseTo(0.0063, 5); // "0.63%" -> fraction

    const generic = res.rows.find((r) => r.query === "generic unbranded")!;
    expect(generic.service_id).toBeNull();
    expect(generic.city_id).toBeNull();
  });

  it("does not invent metrics when cells are empty", () => {
    const res = normalizeSearchConsole(
      [{ Query: "x", Page: "/x", Clicks: "", Impressions: "10", CTR: "", Position: "" }],
      { rules: [] },
    );
    expect(res.rows[0]).toMatchObject({ clicks: null, ctr: null, position: null, impressions: 10 });
  });

  it("skips rows with neither query nor page", () => {
    const res = normalizeSearchConsole(
      [
        { Query: "", Page: "", Clicks: "1", Impressions: "2" },
        { Query: "ok", Page: "", Clicks: "1", Impressions: "2" },
      ],
      { rules: [] },
    );
    expect(res.stats).toEqual({ total: 2, imported: 1, skipped: 1 });
  });

  it("honors a comma decimal separator (locale-aware), without API access", async () => {
    const vcf = loadClientConfig("vivicasafacile", { fileNames: ["config.example.yml"] });
    const rows = await readCsvRows("tests/fixtures/search-console/gsc_vcf_it.csv");
    const res = normalizeSearchConsole(rows, {
      rules: defaultSeoMappingRules(vcf),
      decimal: ",",
    });
    const first = res.rows[0]!;
    expect(first.service_id).toBe("traslochi");
    expect(first.city_id).toBe("genova");
    expect(first.position).toBeCloseTo(6.5, 3);
    expect(first.ctr).toBeCloseTo(0.012, 5); // "1,20%" -> 0.012
  });
});

describe("warehouse integration", () => {
  it("loads fact_search_query and refreshes mart_seo_opportunities", async () => {
    const wh = await freshWarehouse(democoConfig());
    const res = await importSearchConsoleFile(
      wh,
      democoConfig(),
      "tests/fixtures/search-console/gsc_query_page.csv",
    );
    expect(res.stats.imported).toBe(6);

    const fact = await wh.all("SELECT COUNT(*) AS n FROM fact_search_query");
    expect(fact[0]!.n).toBe(6);
    const stray = await wh.all(
      "SELECT COUNT(*) AS n FROM fact_search_query WHERE client_id <> 'democo'",
    );
    expect(stray[0]!.n).toBe(0);

    // mart refreshed; top row matches the known score from the warehouse fixture
    const opps = await getSeoOpportunities(wh);
    expect(opps[0]!.query).toBe("cleaning springfield");
    expect(opps[0]!.service_id).toBe("cleaning");
    expect(opps[0]!.city_id).toBe("springfield");
    expect(opps[0]!.score as number).toBeCloseTo(14.0909, 3);
  });

  it("imports already-parsed rows too", async () => {
    const wh = await freshWarehouse(democoConfig());
    const res = await importSearchConsoleRows(
      wh,
      democoConfig(),
      [{ Query: "cleaning", Page: "/cleaning", Clicks: "1", Impressions: "100", CTR: "1%", Position: "5" }],
    );
    expect(res.stats.imported).toBe(1);
    const fact = await wh.all("SELECT service_id FROM fact_search_query");
    expect(fact[0]!.service_id).toBe("cleaning");
  });
});
