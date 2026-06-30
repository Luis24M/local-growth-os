// Re-exported from the shared CSV reader so both connectors share one implementation.
// RawRow is structurally identical to the shared CsvRow (Record<string, string>).
export { readCsvRows } from "../../lib/csv.js";
