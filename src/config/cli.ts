#!/usr/bin/env tsx
/**
 * Validate a client config file.
 *
 *   npm run validate-config -- clients/vivicasafacile/config.example.yml
 *   tsx src/config/cli.ts clients/vivicasafacile/config.example.yml
 */
import { ConfigError, loadClientConfigFromFile, listEnabledSources } from "./loader.js";
import { SOURCE_TYPES } from "./schema.js";

function main(): number {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("usage: validate-config <path-to-config.yml>");
    return 2;
  }

  try {
    const config = loadClientConfigFromFile(filePath);
    const enabled = listEnabledSources(config);
    const disabled = SOURCE_TYPES.filter((s) => !enabled.includes(s));
    console.log(`OK  ${filePath}`);
    console.log(`    client_id:  ${config.client_id} (${config.client_name})`);
    console.log(`    domain:     ${config.domain}`);
    console.log(`    services:   ${config.services.length}  cities: ${config.cities.length}`);
    console.log(`    enabled:    ${enabled.length ? enabled.join(", ") : "(none)"}`);
    console.log(`    disabled:   ${disabled.length ? disabled.join(", ") : "(none)"}`);
    return 0;
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(`FAIL  ${filePath}`);
      console.error(err.message);
      return 1;
    }
    throw err;
  }
}

process.exit(main());
