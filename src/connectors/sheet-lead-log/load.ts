import type { Warehouse } from "../../warehouse/duckdb/index.js";
import type { NormalizedEvent, NormalizedLead } from "./normalize.js";

function lit(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/** SQL literal for a nullable string. */
function s(value: string | null): string {
  return value === null ? "NULL" : lit(value);
}

/** SQL literal for a boolean. */
function b(value: boolean): string {
  return value ? "TRUE" : "FALSE";
}

/**
 * Insert normalized lead/click rows into an open warehouse's fact tables.
 * `client_id` is set from the caller, never from sheet data.
 */
export async function insertLeadLog(
  wh: Warehouse,
  clientId: string,
  leads: NormalizedLead[],
  events: NormalizedEvent[],
): Promise<void> {
  for (const l of leads) {
    await wh.exec(
      `INSERT INTO fact_lead (
         lead_id, client_id, created_at, source_system, service_id, city_id, landing_path,
         name_present, phone_present, email_present,
         utm_source, utm_medium, utm_campaign, utm_content, utm_term,
         gclid_present, fbclid_present, lead_status
       ) VALUES (
         ${lit(l.lead_id)}, ${lit(clientId)}, ${s(l.created_at)}, ${lit(l.source_system)},
         ${s(l.service_id)}, ${s(l.city_id)}, ${s(l.landing_path)},
         ${b(l.name_present)}, ${b(l.phone_present)}, ${b(l.email_present)},
         ${s(l.utm_source)}, ${s(l.utm_medium)}, ${s(l.utm_campaign)}, ${s(l.utm_content)}, ${s(l.utm_term)},
         ${b(l.gclid_present)}, ${b(l.fbclid_present)}, ${s(l.lead_status)}
       );`,
    );
  }

  for (const e of events) {
    await wh.exec(
      `INSERT INTO fact_event (
         event_id, client_id, event_at, event_name, page_path, service_id, city_id, channel
       ) VALUES (
         ${lit(e.event_id)}, ${lit(clientId)}, ${s(e.event_at)}, ${lit(e.event_name)},
         ${s(e.page_path)}, ${s(e.service_id)}, ${s(e.city_id)}, ${lit(e.channel)}
       );`,
    );
  }
}
