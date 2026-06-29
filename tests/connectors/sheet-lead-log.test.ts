import { afterEach, describe, expect, it } from "vitest";
import { loadClientConfig, parseClientConfig, type ClientConfig } from "../../src/config/index.js";
import { buildWarehouse, Warehouse } from "../../src/warehouse/duckdb/index.js";
import {
  IDENTITY_MAPPING,
  VCF_SHEET_MAPPING,
  importLeadLogFile,
  importLeadLogRows,
  normalizeLeadLog,
  readCsvRows,
  type RawRow,
} from "../../src/connectors/sheet-lead-log/index.js";

function democoConfig(): ClientConfig {
  return parseClientConfig({
    client_id: "democo",
    client_name: "Demo Co",
    domain: "https://www.democo.example",
    timezone: "UTC",
    currency: "USD",
    sources: {},
    services: [
      { id: "cleaning", name: "Cleaning", active: true, priority: 1 },
      { id: "painting", name: "Painting", active: true, priority: 2 },
    ],
    cities: [{ id: "springfield", name: "Springfield", priority: 1 }],
  });
}

const IDENTITY_ROWS: RawRow[] = [
  { channel: "form", created_at: "2026-06-10T09:00:00", service: "Cleaning", city: "Springfield", page: "/cleaning/springfield", name: "Lead A", phone: "555-0100", email: "a@example.com", utm_source: "google", utm_campaign: "spring_promo", gclid: "Cj0gclidX", fbclid: "", lead_status: "new", lead_id: "" },
  { channel: "form", created_at: "2026-06-11", service: "Painting", city: "", page: "/painting", name: "Lead B", phone: "", email: "", utm_source: "", utm_campaign: "", gclid: "", fbclid: "", lead_status: "", lead_id: "" },
  { channel: "whatsapp", created_at: "2026-06-10T10:00:00", service: "Cleaning", city: "Springfield", page: "/cleaning/springfield" },
  { channel: "call", created_at: "2026-06-12", page: "/contact" },
  { channel: "newsletter", created_at: "2026-06-12", page: "/blog" },
];

const opts = {
  clientId: "democo",
  services: [
    { id: "cleaning", name: "Cleaning" },
    { id: "painting", name: "Painting" },
  ],
  cities: [{ id: "springfield", name: "Springfield" }],
};

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

describe("normalizeLeadLog (identity mapping)", () => {
  const res = normalizeLeadLog(IDENTITY_ROWS, IDENTITY_MAPPING, opts);

  it("classifies forms as leads, whatsapp/call as click intent, others skipped", () => {
    expect(res.stats).toEqual({ total: 5, leads: 2, clicks: 2, skipped: 1 });
    expect(res.events.map((e) => e.event_name)).toEqual(["whatsapp_click", "call_click"]);
    expect(res.events.map((e) => e.channel)).toEqual(["whatsapp", "call"]);
  });

  it("reduces PII to presence flags and stores no name/phone/email", () => {
    const [full, minimal] = res.leads;
    expect(full!.name_present).toBe(true);
    expect(full!.phone_present).toBe(true);
    expect(full!.email_present).toBe(true);
    expect(minimal!.name_present).toBe(true);
    expect(minimal!.phone_present).toBe(false);
    expect(minimal!.email_present).toBe(false);
    for (const key of ["name", "phone", "email"]) {
      expect(Object.keys(full!)).not.toContain(key);
    }
  });

  it("preserves UTM/gclid/fbclid when present and nulls them when absent", () => {
    const [full, minimal] = res.leads;
    expect(full!.utm_source).toBe("google");
    expect(full!.utm_campaign).toBe("spring_promo");
    expect(full!.gclid_present).toBe(true);
    expect(full!.fbclid_present).toBe(false);
    expect(minimal!.utm_source).toBeNull();
    expect(minimal!.gclid_present).toBe(false);
  });

  it("resolves service/city to slugs and keeps page + created_at", () => {
    const [full, minimal] = res.leads;
    expect(full!.service_id).toBe("cleaning");
    expect(full!.city_id).toBe("springfield");
    expect(full!.landing_path).toBe("/cleaning/springfield");
    expect(full!.created_at).toBe("2026-06-10T09:00:00");
    expect(full!.source_system).toBe("sheet");
    expect(minimal!.city_id).toBeNull();
  });

  it("generates deterministic ids using the row index", () => {
    expect(res.leads[0]!.lead_id).toBe("sheet:democo:lead:0");
    expect(res.events[0]!.event_id).toBe("sheet:democo:event:2");
  });
});

describe("normalizeLeadLog (VCF pilot mapping)", () => {
  it("normalizes the VCF Italian sheet via evidence-derived preset", async () => {
    const vcf = loadClientConfig("vivicasafacile", { fileNames: ["config.example.yml"] });
    const rows = await readCsvRows("tests/fixtures/sheet-lead-log/lead_log_vcf.csv");
    const res = normalizeLeadLog(rows, VCF_SHEET_MAPPING, {
      clientId: vcf.client_id,
      services: vcf.services.map((s) => ({ id: s.id, name: s.name })),
      cities: vcf.cities.map((c) => ({ id: c.id, name: c.name })),
    });

    expect(res.stats).toEqual({ total: 4, leads: 2, clicks: 2, skipped: 0 });
    expect(res.leads.map((l) => l.service_id)).toEqual(["traslochi", "sgomberi"]);
    expect(res.leads[0]!.name_present).toBe(true);
    expect(res.leads[0]!.phone_present).toBe(true);
    expect(res.leads[1]!.phone_present).toBe(false);
    // origine packs UTMs; we do not guess them apart
    expect(res.leads[0]!.utm_source).toBeNull();
    // no timestamp column in the VCF sheet payload
    expect(res.leads[0]!.created_at).toBeNull();
    expect(res.events.map((e) => e.event_name)).toEqual(["whatsapp_click", "call_click"]);
  });
});

describe("warehouse integration", () => {
  it("inserts leads into fact_lead and clicks into fact_event, stamping client_id", async () => {
    const wh = await freshWarehouse(democoConfig());
    const res = await importLeadLogRows(wh, democoConfig(), IDENTITY_ROWS, IDENTITY_MAPPING);
    expect(res.stats.leads).toBe(2);

    const leads = await wh.all("SELECT COUNT(*) AS n FROM fact_lead");
    const events = await wh.all("SELECT COUNT(*) AS n FROM fact_event");
    expect(leads[0]!.n).toBe(2);
    expect(events[0]!.n).toBe(2);

    const stray = await wh.all("SELECT COUNT(*) AS n FROM fact_lead WHERE client_id <> 'democo'");
    expect(stray[0]!.n).toBe(0);

    // clicks are intent, never confirmed leads/sales
    const channels = await wh.all("SELECT channel FROM fact_event ORDER BY channel");
    expect(channels.map((r) => r.channel)).toEqual(["call", "whatsapp"]);
    const won = await wh.all("SELECT COUNT(*) AS n FROM fact_lead WHERE won_value IS NOT NULL");
    expect(won[0]!.n).toBe(0);
  });

  it("imports directly from a CSV file", async () => {
    const wh = await freshWarehouse(democoConfig());
    const res = await importLeadLogFile(
      wh,
      democoConfig(),
      "tests/fixtures/sheet-lead-log/lead_log_identity.csv",
      IDENTITY_MAPPING,
    );
    expect(res.stats).toEqual({ total: 5, leads: 2, clicks: 2, skipped: 1 });
    const leads = await wh.all("SELECT COUNT(*) AS n FROM fact_lead");
    expect(leads[0]!.n).toBe(2);
  });
});
