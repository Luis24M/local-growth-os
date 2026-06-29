import { join } from "node:path";
import type { ClientConfig } from "../../config/index.js";
import { loadFacts, seedDimensions } from "./load.js";
import { buildMarts } from "./marts.js";
import { DDL } from "./schema.js";
import { Warehouse } from "./warehouse.js";

export interface BuildWarehouseOptions {
  /** Directory holding the client's CSV/JSON fact exports. */
  dataDir?: string;
  /** DuckDB file path, or `:memory:` (default) for an ephemeral warehouse. */
  dbPath?: string;
}

export interface BuildResult {
  warehouse: Warehouse;
  loaded: { table: string; file: string; rows: number }[];
}

/** Default data directory for a client: data/private/<client_id> (git-ignored). */
export function defaultDataDir(clientId: string): string {
  return join("data", "private", clientId);
}

/**
 * Build the local warehouse for a client: create schema, seed dimensions from
 * the validated config, load fact files, and build marts.
 *
 * The caller owns the returned warehouse and must `close()` it. Pass `dataDir`
 * pointing at public fixtures in tests; it defaults to the git-ignored
 * data/private/<client_id> for real runs.
 */
export async function buildWarehouse(
  config: ClientConfig,
  options: BuildWarehouseOptions = {},
): Promise<BuildResult> {
  const dataDir = options.dataDir ?? defaultDataDir(config.client_id);
  const wh = await Warehouse.open(options.dbPath ?? ":memory:");
  await wh.exec(DDL);
  await seedDimensions(wh, config);
  const loaded = await loadFacts(wh, config, dataDir);
  await buildMarts(wh);
  return { warehouse: wh, loaded };
}
