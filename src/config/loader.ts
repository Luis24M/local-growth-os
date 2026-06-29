import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import {
  clientConfigSchema,
  SOURCE_ENV_FIELDS,
  type ClientConfig,
  type SourceType,
} from "./schema.js";

/** Thrown when a client config is missing, unparseable, or fails validation. */
export class ConfigError extends Error {
  readonly issues: string[];
  constructor(message: string, issues: string[] = []) {
    super(issues.length ? `${message}\n${issues.map((i) => `  - ${i}`).join("\n")}` : message);
    this.name = "ConfigError";
    this.issues = issues;
  }
}

function formatZodError(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join(".") || "(root)";
    return `${path}: ${issue.message}`;
  });
}

/** Validate an already-parsed config object. Throws ConfigError on failure. */
export function parseClientConfig(raw: unknown): ClientConfig {
  const result = clientConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new ConfigError("Invalid client config", formatZodError(result.error));
  }
  return result.data;
}

/** Parse and validate a YAML config string. */
export function parseClientConfigYaml(yaml: string): ClientConfig {
  let raw: unknown;
  try {
    raw = parseYaml(yaml);
  } catch (err) {
    throw new ConfigError(`Could not parse YAML: ${(err as Error).message}`);
  }
  return parseClientConfig(raw);
}

/** Load and validate a config from an explicit file path. */
export function loadClientConfigFromFile(filePath: string): ClientConfig {
  if (!existsSync(filePath)) {
    throw new ConfigError(`Config file not found: ${filePath}`);
  }
  return parseClientConfigYaml(readFileSync(filePath, "utf8"));
}

export interface LoadClientConfigOptions {
  /** Directory holding `clients/<id>/`. Defaults to `clients` in the cwd. */
  clientsDir?: string;
  /**
   * Candidate file names to try in order. Defaults to the real config first,
   * then the committed example (useful for tests and dry runs).
   */
  fileNames?: string[];
}

/**
 * Load a client config by id, resolving `clients/<id>/config.yml` and falling
 * back to `config.example.yml`. Fails closed if no candidate exists.
 */
export function loadClientConfig(
  clientId: string,
  options: LoadClientConfigOptions = {},
): ClientConfig {
  const clientsDir = options.clientsDir ?? "clients";
  const fileNames = options.fileNames ?? ["config.yml", "config.example.yml"];
  const tried: string[] = [];
  for (const fileName of fileNames) {
    const candidate = join(clientsDir, clientId, fileName);
    tried.push(candidate);
    if (existsSync(candidate)) {
      const config = loadClientConfigFromFile(candidate);
      if (config.client_id !== clientId) {
        throw new ConfigError(
          `client_id mismatch: file ${candidate} declares "${config.client_id}" but was loaded as "${clientId}"`,
        );
      }
      return config;
    }
  }
  throw new ConfigError(`No config found for client "${clientId}". Tried:`, tried);
}

/** True if a source is declared and enabled in the config. */
export function isSourceEnabled(config: ClientConfig, source: SourceType): boolean {
  return config.sources[source]?.enabled === true;
}

/** List the source types that are declared and enabled. */
export function listEnabledSources(config: ClientConfig): SourceType[] {
  return (Object.keys(config.sources) as SourceType[]).filter((s) => isSourceEnabled(config, s));
}

/**
 * Resolve the runtime values for an enabled source's env references.
 *
 * Fails closed: throws if the source is not enabled, or if any referenced env
 * var is unset/empty. This is where "no secrets in config" pays off — values
 * come from the environment, never from the committed config file.
 */
export function resolveSourceEnv(
  config: ClientConfig,
  source: SourceType,
  env: NodeJS.ProcessEnv = process.env,
): Record<string, string> {
  if (!isSourceEnabled(config, source)) {
    throw new ConfigError(`Source "${source}" is not enabled for client "${config.client_id}"`);
  }
  const block = config.sources[source] as Record<string, unknown>;
  const resolved: Record<string, string> = {};
  const missing: string[] = [];
  for (const field of SOURCE_ENV_FIELDS[source]) {
    const envName = block[field] as string | undefined;
    if (!envName) continue; // optional field not declared
    const value = env[envName];
    if (value === undefined || value === "") {
      missing.push(`${field} -> ${envName}`);
      continue;
    }
    resolved[field] = value;
  }
  if (missing.length) {
    throw new ConfigError(
      `Source "${source}" enabled but environment is incomplete`,
      missing.map((m) => `unset env var for ${m}`),
    );
  }
  return resolved;
}
