/**
 * Verificación de la base de datos (sirve para Supabase, Neon, local, etc.).
 *
 *   npm run db:verify
 *
 * Informa a qué base se está conectando, si el esquema está completo
 * (incluidas las tablas del rastreo web) y si hay contenido cargado.
 */
import "../src/db/env";
import { sql } from "drizzle-orm";
import { Client } from "pg";
import { db } from "../src/db";
import { TABLES, describeUrl } from "../src/lib/db-transfer";

const REQUIRED_TABLES = [
  "users",
  "site_profile",
  "credentials",
  "posts",
  "media_items",
  "messages",
  "discovery_topics",
  "discovery_leads",
];

interface TableCount {
  table_name: string;
  filas: number;
}

async function main() {
  const info = await db.execute(sql`
    select
      current_database() as base,
      current_user as usuario,
      version() as version,
      inet_server_addr()::text as host
  `);
  const row = info.rows[0] as Record<string, string>;

  console.log("\n=== Conexión ===");
  console.log(`Base:     ${row.base}`);
  console.log(`Usuario:  ${row.usuario}`);
  console.log(`Host:     ${row.host}`);
  console.log(`Versión:  ${String(row.version).split(" ").slice(0, 2).join(" ")}`);

  const tables = await db.execute(sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
  `);
  const present = new Set(tables.rows.map((r) => String(r.table_name)));
  const missing = REQUIRED_TABLES.filter((table) => !present.has(table));

  console.log("\n=== Esquema ===");
  console.log(
    missing.length === 0
      ? "✔ Todas las tablas del proyecto están creadas."
      : `✘ Faltan tablas: ${missing.join(", ")}\n  → corré: npm run db:push`,
  );

  const statusColumn = await db.execute(sql`
    select 1
    from information_schema.columns
    where table_name = 'media_items' and column_name = 'status'
  `);
  if (statusColumn.rows.length === 0) {
    console.log("✘ Falta media_items.status → corré: npm run db:push");
  }

  if (missing.length === 0) {
    const counts = await db.execute(sql`
      select 'posts' as table_name, count(*)::int as filas from posts
      union all select 'media_items', count(*)::int from media_items
      union all select 'credentials', count(*)::int from credentials
      union all select 'messages', count(*)::int from messages
      union all select 'discovery_topics', count(*)::int from discovery_topics
      union all select 'discovery_leads', count(*)::int from discovery_leads
      order by table_name
    `);
    console.log("\n=== Contenido ===");
    for (const item of counts.rows as unknown as TableCount[]) {
      console.log(`  ${item.table_name.padEnd(18)} ${item.filas}`);
    }

    const admins = await db.execute(
      sql`select count(*)::int as total from users where email = 'admin@elenakuchimpos.com'`,
    );
    const hasAdmin = Number((admins.rows[0] as { total: number }).total) > 0;
    console.log(
      hasAdmin
        ? "\n✔ Usuario admin presente."
        : "\n✘ No existe el usuario admin → corré: npm run db:seed",
    );
  }

  // Comparación opcional contra otra base (por ejemplo, la local vs Supabase):
  //   COMPARE_WITH=postgresql://…  npm run db:verify
  const compareWith = process.env.COMPARE_WITH ?? process.env.SOURCE_DATABASE_URL;
  if (compareWith && missing.length === 0) {
    console.log("\n=== Comparación de contenido ===");
    console.log(`Referencia: ${describeUrl(compareWith)}`);
    console.log(`Destino:    ${describeUrl(process.env.DATABASE_URL ?? "")}`);

    const client = new Client({ connectionString: compareWith });
    await client.connect();
    let differences = 0;
    try {
      for (const table of TABLES) {
        // jsonb ordena las claves: la comparación no depende del orden físico
        // de las columnas.
        const query = `select coalesce(md5(string_agg(x, '|' order by x)), 'vacio') as h
                         from (select row_to_json(t)::jsonb::text as x from "${table}" t) s`;

        const reference = (await client.query<{ h: string }>(query)).rows[0].h;
        const current = (
          (await db.execute(sql.raw(query))).rows[0] as { h: string }
        ).h;
        const same = reference === current;
        if (!same) differences += 1;
        console.log(
          `  ${same ? "✔" : "✘"} ${table.padEnd(18)} ${reference.slice(0, 10)} / ${current.slice(0, 10)}`,
        );
      }
    } finally {
      await client.end().catch(() => undefined);
    }

    console.log(
      differences === 0
        ? "  → Contenido idéntico entre las dos bases ✅"
        : `  → ${differences} tabla(s) con diferencias ⚠️`,
    );
  }

  const ok = missing.length === 0;
  console.log(
    ok
      ? "\nBase lista para usar ✅\n"
      : "\nBase incompleta: ejecutá `npm run db:setup` ❌\n",
  );
  process.exitCode = ok ? 0 : 1;
}

main()
  .catch((error) => {
    console.error("\n✘ No se pudo conectar con la base de datos:\n");
    console.error(error instanceof Error ? error.message : error);
    console.error(
      "\nRevisá DATABASE_URL / DIRECT_URL en .env.local. Si es Supabase: usá el pooler\n(session pooler, puerto 5432) y verificá que el proyecto no esté pausado.\n",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$client?.end?.().catch(() => undefined);
  });
