#!/usr/bin/env tsx
/**
 * Build a client's local DuckDB warehouse and print the top SEO opportunities.
 *
 *   npm run build-warehouse -- <clientId> [--data <dir>] [--db <path>] [--top N]
 *
 * Defaults: data dir = data/private/<clientId> (git-ignored), db = :memory:.
 */
import { ConfigError, loadClientConfig } from "../../config/index.js";
import { buildWarehouse, defaultDataDir } from "./build.js";
import { getSeoOpportunities } from "./marts.js";

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<number> {
  const clientId = process.argv[2];
  if (!clientId || clientId.startsWith("--")) {
    console.error("usage: build-warehouse <clientId> [--data <dir>] [--db <path>] [--top N]");
    return 2;
  }
  const dataDir = flag("--data") ?? defaultDataDir(clientId);
  const dbPath = flag("--db");
  const top = Number(flag("--top") ?? 10);

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

  const { warehouse, loaded } = await buildWarehouse(config, { dataDir, dbPath });
  try {
    console.log(`Warehouse built for ${config.client_id}`);
    console.log(`  data dir: ${dataDir}`);
    console.log(`  db:       ${dbPath ?? ":memory:"}`);
    if (loaded.length === 0) {
      console.log("  facts:    (no fact files found)");
    } else {
      for (const l of loaded) console.log(`  loaded:   ${l.table}  ${l.rows} rows  <- ${l.file}`);
    }
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
