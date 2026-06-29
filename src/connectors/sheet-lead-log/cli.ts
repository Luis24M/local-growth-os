#!/usr/bin/env tsx
/**
 * Import a Google Sheet / CSV lead+click log into a client's local warehouse.
 * CSV export first — no Google Sheets API. Clicks are intent, not confirmed leads.
 *
 *   npm run import-lead-log -- <clientId> [csvPath] [--mapping vcf|identity]
 *
 * Defaults: csvPath = data/private/<clientId>/lead_log.csv, mapping = identity.
 */
import { join } from "node:path";
import { ConfigError, loadClientConfig } from "../../config/index.js";
import { buildWarehouse, defaultDataDir } from "../../warehouse/duckdb/index.js";
import { importLeadLogFile } from "./import.js";
import { MAPPING_PRESETS } from "./mapping.js";

function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<number> {
  const clientId = process.argv[2];
  if (!clientId || clientId.startsWith("--")) {
    console.error("usage: import-lead-log <clientId> [csvPath] [--mapping vcf|identity]");
    return 2;
  }
  const positional = process.argv[3];
  const csvPath =
    positional && !positional.startsWith("--")
      ? positional
      : join(defaultDataDir(clientId), "lead_log.csv");
  const mappingName = flag("--mapping") ?? "identity";
  const mapping = MAPPING_PRESETS[mappingName];
  if (!mapping) {
    console.error(`unknown mapping "${mappingName}". Available: ${Object.keys(MAPPING_PRESETS).join(", ")}`);
    return 2;
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

  const { warehouse } = await buildWarehouse(config, { dataDir: defaultDataDir(clientId) });
  try {
    const result = await importLeadLogFile(warehouse, config, csvPath, mapping);
    console.log(`Imported lead log for ${config.client_id}`);
    console.log(`  source:  ${csvPath}  (mapping: ${mappingName})`);
    console.log(`  rows:    ${result.stats.total}`);
    console.log(`  leads:   ${result.stats.leads}  -> fact_lead`);
    console.log(`  clicks:  ${result.stats.clicks}  -> fact_event (intent, not confirmed)`);
    console.log(`  skipped: ${result.stats.skipped}`);
  } finally {
    await warehouse.close();
  }
  return 0;
}

process.exit(await main());
