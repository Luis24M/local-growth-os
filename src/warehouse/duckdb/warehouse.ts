import { DuckDBConnection, DuckDBInstance } from "@duckdb/node-api";

/** A plain JS row with BigInt values down-converted to Number. */
export type Row = Record<string, unknown>;

/** Convert DuckDB BigInt values (INTEGER/BIGINT columns) to Number for ergonomics. */
function normalizeValue(value: unknown): unknown {
  if (typeof value === "bigint") return Number(value);
  return value;
}

function normalizeRow(row: Row): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) out[k] = normalizeValue(v);
  return out;
}

/**
 * Thin async wrapper around a DuckDB connection.
 *
 * Use `:memory:` for tests and a file path (under data/private/<client>/, which
 * is git-ignored) for real runs.
 */
export class Warehouse {
  private constructor(
    private readonly instance: DuckDBInstance,
    private readonly connection: DuckDBConnection,
  ) {}

  static async open(path = ":memory:"): Promise<Warehouse> {
    const instance = await DuckDBInstance.create(path);
    const connection = await instance.connect();
    return new Warehouse(instance, connection);
  }

  /** Run a statement (or several separated by `;`) with no result. */
  async exec(sql: string): Promise<void> {
    await this.connection.run(sql);
  }

  /** Run a query and return normalized row objects. */
  async all(sql: string): Promise<Row[]> {
    const reader = await this.connection.runAndReadAll(sql);
    return reader.getRowObjects().map(normalizeRow);
  }

  /** Column names of a table, in definition order. */
  async columns(table: string): Promise<string[]> {
    const rows = await this.all(
      `SELECT column_name FROM information_schema.columns WHERE table_name = '${table.replace(/'/g, "''")}' ORDER BY ordinal_position`,
    );
    return rows.map((r) => String(r.column_name));
  }

  async close(): Promise<void> {
    this.connection.closeSync();
    this.instance.closeSync();
  }
}
