import { describe, expect, it } from "vitest";
import {
  ConfigError,
  isSourceEnabled,
  listEnabledSources,
  loadClientConfig,
  loadClientConfigFromFile,
  parseClientConfig,
  resolveSourceEnv,
} from "../../src/config/index.js";

/** A minimal, valid config object used as a base for negative-case mutations. */
function baseConfig(): Record<string, unknown> {
  return {
    client_id: "testco",
    client_name: "Test Co",
    domain: "https://www.example.com",
    timezone: "Europe/Rome",
    currency: "EUR",
    sources: {
      ga4: { enabled: false, property_id_env: "GA4_PROPERTY_ID" },
    },
    services: [{ id: "traslochi", name: "Traslochi", active: true, priority: 1 }],
    cities: [{ id: "genova", name: "Genova", priority: 1 }],
  };
}

describe("VCF pilot config", () => {
  const path = "clients/vivicasafacile/config.example.yml";

  it("validates the committed VCF example config", () => {
    const config = loadClientConfigFromFile(path);
    expect(config.client_id).toBe("vivicasafacile");
    expect(config.services.length).toBe(7);
    expect(config.cities.length).toBe(4);
    expect(listEnabledSources(config)).toEqual([]); // all sources disabled in example
  });

  it("loads by client id with an explicit example file name", () => {
    const config = loadClientConfig("vivicasafacile", { fileNames: ["config.example.yml"] });
    expect(config.client_name).toBe("Vivi Casa Facile");
  });

  it("throws when the client does not exist", () => {
    expect(() => loadClientConfig("nope", { fileNames: ["config.example.yml"] })).toThrow(
      ConfigError,
    );
  });
});

describe("validation", () => {
  it("accepts the base config", () => {
    expect(() => parseClientConfig(baseConfig())).not.toThrow();
  });

  it("rejects a missing client_id", () => {
    const cfg = baseConfig();
    delete cfg.client_id;
    expect(() => parseClientConfig(cfg)).toThrow(/client_id/);
  });

  it("rejects an unknown source type (object)", () => {
    const cfg = baseConfig();
    (cfg.sources as Record<string, unknown>).tiktok_ads = { enabled: true };
    expect(() => parseClientConfig(cfg)).toThrow(ConfigError);
  });

  it("rejects an unknown source type (from YAML fixture)", () => {
    expect(() => loadClientConfigFromFile("tests/fixtures/config/unknown-source.yml")).toThrow(
      ConfigError,
    );
  });

  it("rejects a literal secret where an env var name is expected", () => {
    const cfg = baseConfig();
    (cfg.sources as Record<string, Record<string, unknown>>).ghl = {
      enabled: true,
      location_id_env: "ghl-pit-abc123secret", // literal value, not an ENV_VAR name
    };
    expect(() => parseClientConfig(cfg)).toThrow(/ENV_VAR/);
  });

  it("rejects an invalid domain", () => {
    const cfg = baseConfig();
    cfg.domain = "not-a-url";
    expect(() => parseClientConfig(cfg)).toThrow(ConfigError);
  });

  it("rejects a non-ISO currency", () => {
    const cfg = baseConfig();
    cfg.currency = "euro";
    expect(() => parseClientConfig(cfg)).toThrow(ConfigError);
  });

  it("rejects duplicate service ids", () => {
    const cfg = baseConfig();
    cfg.services = [
      { id: "dup", name: "A", active: true, priority: 1 },
      { id: "dup", name: "B", active: true, priority: 2 },
    ];
    expect(() => parseClientConfig(cfg)).toThrow(/duplicate service id/);
  });

  it("rejects an invalid slug", () => {
    const cfg = baseConfig();
    cfg.client_id = "Test Co";
    expect(() => parseClientConfig(cfg)).toThrow(/slug/);
  });
});

describe("source helpers", () => {
  it("reports enabled sources", () => {
    const cfg = baseConfig();
    (cfg.sources as Record<string, Record<string, unknown>>).ga4 = {
      enabled: true,
      property_id_env: "GA4_PROPERTY_ID",
    };
    const config = parseClientConfig(cfg);
    expect(isSourceEnabled(config, "ga4")).toBe(true);
    expect(isSourceEnabled(config, "ghl")).toBe(false);
    expect(listEnabledSources(config)).toEqual(["ga4"]);
  });

  it("resolveSourceEnv fails closed when the env var is unset", () => {
    const cfg = baseConfig();
    (cfg.sources as Record<string, Record<string, unknown>>).ga4 = {
      enabled: true,
      property_id_env: "GA4_PROPERTY_ID",
    };
    const config = parseClientConfig(cfg);
    expect(() => resolveSourceEnv(config, "ga4", {})).toThrow(/incomplete/);
  });

  it("resolveSourceEnv returns env values when set", () => {
    const cfg = baseConfig();
    (cfg.sources as Record<string, Record<string, unknown>>).ga4 = {
      enabled: true,
      property_id_env: "GA4_PROPERTY_ID",
    };
    const config = parseClientConfig(cfg);
    const resolved = resolveSourceEnv(config, "ga4", { GA4_PROPERTY_ID: "123456" });
    expect(resolved).toEqual({ property_id_env: "123456" });
  });

  it("resolveSourceEnv throws for a disabled source", () => {
    const config = parseClientConfig(baseConfig());
    expect(() => resolveSourceEnv(config, "ga4", { GA4_PROPERTY_ID: "x" })).toThrow(/not enabled/);
  });
});
