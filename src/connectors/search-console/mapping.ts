import type { ClientConfig } from "../../config/index.js";

/**
 * Configurable rules that map a Search Console query/page to a service_id and
 * city_id. Rules are DATA, never hardcoded business strings: defaults are
 * derived from the client config, and callers may add explicit rules.
 */
export interface MappingRule {
  /** Text to look for (lowercased, accent-stripped before matching). */
  pattern: string;
  /** How to match. Default `contains`. */
  match?: "contains" | "regex";
  /** Which text to match against. Default `any` (query + page). */
  field?: "query" | "page" | "any";
  /** Assigned when the rule matches and the dimension is still unset. */
  service_id?: string;
  city_id?: string;
}

/** Lowercase + strip accents; keeps spaces and alphanumerics for natural-language match. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Derive default rules from the client config: each service and city becomes a
 * rule keyed on its display name (for natural-language queries) and, when
 * different, its slug id (for URL paths). Order follows config order.
 */
export function defaultSeoMappingRules(config: ClientConfig): MappingRule[] {
  const rules: MappingRule[] = [];
  for (const s of config.services) {
    rules.push({ pattern: normalizeText(s.name), field: "any", service_id: s.id });
    if (normalizeText(s.name) !== s.id) {
      rules.push({ pattern: s.id, field: "any", service_id: s.id });
    }
  }
  for (const c of config.cities) {
    rules.push({ pattern: normalizeText(c.name), field: "any", city_id: c.id });
    if (normalizeText(c.name) !== c.id) {
      rules.push({ pattern: c.id, field: "any", city_id: c.id });
    }
  }
  return rules;
}

function ruleMatches(rule: MappingRule, query: string, page: string): boolean {
  const field = rule.field ?? "any";
  const haystack = normalizeText(
    field === "query" ? query : field === "page" ? page : `${query} ${page}`,
  );
  if (rule.match === "regex") {
    try {
      return new RegExp(rule.pattern, "i").test(haystack);
    } catch {
      return false;
    }
  }
  return haystack.includes(normalizeText(rule.pattern));
}

/**
 * Apply rules in order. First matching rule that carries a service_id sets the
 * service (others ignored), same for city_id — so service and city resolve
 * independently and deterministically.
 */
export function applyMappingRules(
  query: string,
  page: string,
  rules: MappingRule[],
): { service_id: string | null; city_id: string | null } {
  let service_id: string | null = null;
  let city_id: string | null = null;
  for (const rule of rules) {
    if ((service_id && city_id) || !ruleMatches(rule, query, page)) continue;
    if (!service_id && rule.service_id) service_id = rule.service_id;
    if (!city_id && rule.city_id) city_id = rule.city_id;
  }
  return { service_id, city_id };
}
