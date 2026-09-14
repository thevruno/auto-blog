import { sql } from "drizzle-orm";
import { db } from "./index";

/**
 * Garantiza que existan las tablas y columnas que agregó el módulo de rastreo
 * web. Es idempotente y se ejecuta una sola vez por proceso.
 *
 * Sirve para instalaciones que no corren `drizzle-kit push` en el deploy: sin
 * esto, el panel rompería al consultar tablas inexistentes.
 */
let bootstrapPromise: Promise<void> | null = null;

const STATEMENTS = [
  sql`ALTER TABLE "media_items" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'published'`,
  sql`
    CREATE TABLE IF NOT EXISTS "discovery_topics" (
      "id" serial PRIMARY KEY,
      "label" text NOT NULL,
      "query" text NOT NULL,
      "providers" text[] NOT NULL DEFAULT '{}',
      "strict_match" boolean NOT NULL DEFAULT false,
      "is_primary" boolean NOT NULL DEFAULT false,
      "is_active" boolean NOT NULL DEFAULT true,
      "last_run_at" timestamp,
      "last_run_new" integer NOT NULL DEFAULT 0,
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    )
  `,
  sql`
    CREATE TABLE IF NOT EXISTS "discovery_leads" (
      "id" serial PRIMARY KEY,
      "topic_id" integer REFERENCES "discovery_topics"("id") ON DELETE SET NULL,
      "query" text NOT NULL,
      "provider" text NOT NULL,
      "type" text NOT NULL,
      "title" text NOT NULL,
      "url" text NOT NULL,
      "normalized_url" text NOT NULL UNIQUE,
      "source_name" text,
      "source_domain" text,
      "author" text,
      "snippet" text,
      "thumbnail" text,
      "published_at" timestamp,
      "status" text NOT NULL DEFAULT 'new',
      "times_seen" integer NOT NULL DEFAULT 1,
      "last_seen_at" timestamp DEFAULT now(),
      "media_item_id" integer REFERENCES "media_items"("id") ON DELETE SET NULL,
      "post_id" integer REFERENCES "posts"("id") ON DELETE SET NULL,
      "discovered_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    )
  `,
  sql`CREATE INDEX IF NOT EXISTS "discovery_leads_status_idx" ON "discovery_leads" ("status")`,
  sql`CREATE INDEX IF NOT EXISTS "discovery_leads_published_at_idx" ON "discovery_leads" ("published_at")`,
  sql`CREATE INDEX IF NOT EXISTS "discovery_leads_provider_idx" ON "discovery_leads" ("provider")`,
  // Tema inicial: la persona que da nombre al sitio (si todavía no hay ninguno).
  sql`
    INSERT INTO "discovery_topics" ("label", "query", "is_primary")
    SELECT p."name", p."name", true
    FROM "site_profile" p
    WHERE NOT EXISTS (SELECT 1 FROM "discovery_topics")
    LIMIT 1
  `,
  sql`
    INSERT INTO "discovery_topics" ("label", "query", "is_primary")
    SELECT 'Elena Kuchimpos', 'Elena Kuchimpos', true
    WHERE NOT EXISTS (SELECT 1 FROM "discovery_topics")
      AND NOT EXISTS (SELECT 1 FROM "site_profile")
  `,
];

export function ensureSchema(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      for (const statement of STATEMENTS) {
        await db.execute(statement);
      }
    })().catch((error) => {
      // Permite reintentar en el próximo request en vez de cachear el fallo.
      bootstrapPromise = null;
      throw error;
    });
  }
  return bootstrapPromise;
}

/**
 * Igual que `ensureSchema` pero sin propagar errores: para páginas públicas
 * donde un problema de migración no debe tumbar el sitio.
 */
export async function ensureSchemaSafe(): Promise<boolean> {
  try {
    await ensureSchema();
    return true;
  } catch (error) {
    console.error("[db] No se pudo aplicar el esquema extendido:", error);
    return false;
  }
}
