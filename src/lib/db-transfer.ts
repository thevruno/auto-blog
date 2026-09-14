import { Client, type ClientConfig } from "pg";
import { normalizeDatabaseUrl } from "./db-url";

/**
 * Transferencia de contenido entre bases (o desde/hacia un archivo JSON).
 * Lo usan `npm run db:migrate`, `db:export` y `db:import`.
 */

/** Orden importante: primero las tablas de las que dependen otras. */
export const TABLES = [
  "users",
  "site_profile",
  "credentials",
  "posts",
  "media_items",
  "discovery_topics",
  "discovery_leads",
  "messages",
] as const;

export type TableName = (typeof TABLES)[number];

const BATCH_SIZE = 200;

export interface TableData {
  columns: string[];
  rows: Record<string, unknown>[];
}

export type ContentDump = {
  generatedAt: string;
  source: string;
  tables: Record<string, TableData>;
};

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export function describeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}:${parsed.port || "5432"}${parsed.pathname}`;
  } catch {
    return "base desconocida";
  }
}

export async function connectDb(url: string, label: string): Promise<Client> {
  const config: ClientConfig = {
    connectionString: normalizeDatabaseUrl(url),
    connectionTimeoutMillis: 15_000,
    application_name: `auto-blog-${label}`,
  };
  const client = new Client(config);
  await client.connect();
  return client;
}

/**
 * Las columnas de fecha se leen como texto con precisión de microsegundos:
 * evita que Postgres las redondee a milisegundos (o las convierta de zona
 * horaria) al pasar por JavaScript.
 */
const TEMPORAL_EXPRESSIONS: Record<string, (column: string) => string> = {
  "timestamp without time zone": (column) =>
    `to_char(${column}, 'YYYY-MM-DD"T"HH24:MI:SS.US')`,
  "timestamp with time zone": (column) =>
    `to_char(${column} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US') || '+00:00'`,
  date: (column) => `to_char(${column}, 'YYYY-MM-DD')`,
};

async function columnTypes(
  client: Client,
  table: string,
): Promise<Map<string, string>> {
  const result = await client.query<{ column_name: string; data_type: string }>(
    `select column_name, data_type
       from information_schema.columns
      where table_schema = 'public' and table_name = $1
      order by ordinal_position`,
    [table],
  );
  return new Map(result.rows.map((row) => [row.column_name, row.data_type]));
}

export async function readTable(
  client: Client,
  table: string,
): Promise<TableData> {
  const types = await columnTypes(client, table);
  if (types.size === 0) {
    throw new Error(`La tabla «${table}» no existe en la base de origen.`);
  }

  const columns = Array.from(types.keys());
  const selection = columns
    .map((column) => {
      const quoted = quoteIdent(column);
      const expression = TEMPORAL_EXPRESSIONS[types.get(column) ?? ""]?.(quoted);
      return `${expression ?? quoted} as ${quoted}`;
    })
    .join(", ");

  const result = await client.query(
    `select ${selection} from ${quoteIdent(table)}`,
  );

  return {
    columns,
    rows: result.rows as Record<string, unknown>[],
  };
}

export async function readAll(
  client: Client,
  tables: readonly string[] = TABLES,
): Promise<Record<string, TableData>> {
  const data: Record<string, TableData> = {};
  for (const table of tables) {
    data[table] = await readTable(client, table);
  }
  return data;
}

/** Copia filas de `rows` con los `columns` indicados (reemplaza el contenido). */
export async function writeRows(
  client: Client,
  table: string,
  columns: string[],
  rows: Record<string, unknown>[],
): Promise<number> {
  await client.query(`delete from ${quoteIdent(table)}`);

  let written = 0;
  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const chunk = rows.slice(index, index + BATCH_SIZE);
    const params: unknown[] = [];
    const values = chunk
      .map((row) => {
        const placeholders = columns.map((column) => {
          params.push(row[column] ?? null);
          return `$${params.length}`;
        });
        return `(${placeholders.join(", ")})`;
      })
      .join(", ");

    if (!values) continue;

    await client.query(
      `insert into ${quoteIdent(table)} (${columns
        .map(quoteIdent)
        .join(", ")}) values ${values}`,
      params,
    );
    written += chunk.length;
  }

  // Las secuencias siguen desde el último id copiado.
  if (columns.includes("id") && rows.length > 0) {
    await client.query(
      `select setval(pg_get_serial_sequence($1, 'id'), coalesce((select max(id) from ${quoteIdent(
        table,
      )}), 1))`,
      [table],
    );
  }

  return written;
}

export async function countRows(client: Client, table: string): Promise<number> {
  const result = await client.query(
    `select count(*)::int as total from ${quoteIdent(table)}`,
  );
  return Number(result.rows[0].total);
}

export interface TransferRow {
  table: string;
  source: number;
  target: number;
}

/** Copia de base a base. */
export async function transferBetween(
  sourceUrl: string,
  targetUrl: string,
  options: { tables?: readonly string[]; dryRun?: boolean } = {},
): Promise<TransferRow[]> {
  const tables = options.tables ?? TABLES;
  const dryRun = options.dryRun ?? false;

  const source = await connectDb(sourceUrl, "source");
  const target = await connectDb(targetUrl, "target");
  const report: TransferRow[] = [];

  try {
    for (const table of tables) {
      const data = await readTable(source, table);
      const written = dryRun
        ? data.rows.length
        : await writeRows(target, table, data.columns, data.rows);
      const targetCount = dryRun ? written : await countRows(target, table);
      report.push({ table, source: data.rows.length, target: targetCount });
    }
  } finally {
    await source.end().catch(() => undefined);
    await target.end().catch(() => undefined);
  }

  return report;
}

/** Vuelca todo el contenido a un archivo JSON portable. */
export async function dumpToJson(
  sourceUrl: string,
  filePath: string,
): Promise<{ dump: ContentDump; report: TransferRow[] }> {
  const client = await connectDb(sourceUrl, "export");
  try {
    const tables = await readAll(client);
    const dump: ContentDump = {
      generatedAt: new Date().toISOString(),
      source: describeUrl(sourceUrl),
      tables,
    };
    const { writeFile } = await import("node:fs/promises");
    await writeFile(filePath, `${JSON.stringify(dump, null, 2)}\n`, "utf8");
    return {
      dump,
      report: Object.entries(tables).map(([table, data]) => ({
        table,
        source: data.rows.length,
        target: data.rows.length,
      })),
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}

/** Carga un archivo JSON portable en la base destino. */
export async function loadFromJson(
  targetUrl: string,
  filePath: string,
  options: { tables?: readonly string[]; dryRun?: boolean } = {},
): Promise<{ dump: ContentDump; report: TransferRow[] }> {
  const { readFile } = await import("node:fs/promises");
  const dump = JSON.parse(await readFile(filePath, "utf8")) as ContentDump;
  const tables = options.tables ?? TABLES;

  const target = await connectDb(targetUrl, "import");
  const report: TransferRow[] = [];

  try {
    for (const table of tables) {
      const data = dump.tables[table] ?? { columns: [], rows: [] };
      const written = options.dryRun
        ? data.rows.length
        : await writeRows(target, table, data.columns, data.rows);
      const targetCount = options.dryRun ? written : await countRows(target, table);
      report.push({ table, source: data.rows.length, target: targetCount });
    }
  } finally {
    await target.end().catch(() => undefined);
  }

  return { dump, report };
}
