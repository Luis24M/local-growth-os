#!/usr/bin/env tsx
/**
 * Import a Google Search Console CSV export into a client's local warehouse and
 * refresh SEO opportunities. CSV export first — no OAuth/API.
 *
 *   npm run import-search-console -- <clientId> [csvPath] [--rules <path>] [--decimal . | ,] [--top N]
 *
 * Defaults: csvPath = data/private/<clientId>/search_console.csv, decimal = ".".
 * Mapping rules default to the client config (services/cities); an optional
 * YAML/JSON file adds explicit rules that take precedence.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { ConfigError, loadClientConfig } from "../../config/index.js";
import { buildWarehouse, defaultDataDir, getSeoOpportunities } from "../../warehouse/duckdb/index.js";
import { importSearchConsoleFile } from "./import.js";
import type { MappingRule } from "./mapping.js";

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function loadRulesFile(path: string): MappingRule[] {
  const parsed = parseYaml(readFileSync(path, "utf8"));
  if (!Array.isArray(parsed)) throw new Error(`rules file must be a list: ${path}`);
  return parsed as MappingRule[];
}

async function main(): Promise<number> {
  const clientId = process.argv[2];
  if (!clientId || clientId.startsWith("--")) {
    console.error(
      "usage: import-search-console <clientId> [csvPath] [--rules <path>] [--decimal . | ,] [--top N]",
    );
    return 2;
  }
  const positional = process.argv[3];
  const csvPath =
    positional && !positional.startsWith("--")
      ? positional
      : join(defaultDataDir(clientId), "search_console.csv");
  const rulesPath = flag("--rules");
  const decimal = flag("--decimal") === "," ? "," : ".";
  const top = Number(flag("--top") ?? 10);

  if (!existsSync(csvPath)) {
    console.error(`FAIL  CSV not found: ${csvPath}`);
    return 1;
  }

  let config;
  try {
    config = loadClientConfig(clientId);
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(`FAIL  config for "${clientId}"\n${err.message}`);
      return 1;
    }
    throw err;
  }

  const rules = rulesPath ? loadRulesFile(rulesPath) : undefined;
  const { warehouse } = await buildWarehouse(config, { dataDir: defaultDataDir(clientId) });
  try {
    const result = await importSearchConsoleFile(warehouse, config, csvPath, { rules, decimal });
    const mapped = result.rows.filter((r) => r.service_id || r.city_id).length;
    console.log(`Imported Search Console for ${config.client_id}`);
    console.log(`  source:   ${csvPath}  (decimal: "${decimal}"${rulesPath ? `, rules: ${rulesPath}` : ""})`);
    console.log(`  rows:     ${result.stats.total}`);
    console.log(`  imported: ${result.stats.imported}  -> fact_search_query`);
    console.log(`  mapped:   ${mapped} rows matched a service or city rule`);
    console.log(`  skipped:  ${result.stats.skipped}`);

    const opps = await getSeoOpportunities(warehouse, top);
    console.log(`\nTop ${opps.length} SEO opportunities:`);
    for (const o of opps) {
      console.log(
        `  ${String(o.score).padStart(7)}  ${o.query}  [${o.service_id ?? "-"}/${o.city_id ?? "-"}]  imp=${o.impressions} pos=${o.avg_position}`,
      );
    }
  } finally {
    await warehouse.close();
  }
  return 0;
}

process.exit(await main());
