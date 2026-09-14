import "./src/db/env";
import { defineConfig } from "drizzle-kit";
import { normalizeDatabaseUrl } from "./src/lib/db-url";

/**
 * Configuración de Drizzle Kit.
 *
 * Para migrar el esquema (`npm run db:push`) se usa, en este orden:
 *   1. DIRECT_URL    → conexión directa / session pooler (permite DDL)
 *   2. DATABASE_URL  → conexión de la app
 *
 * Con Supabase, `DATABASE_URL` puede ser el transaction pooler (puerto 6543)
 * para la app y `DIRECT_URL` el session pooler (puerto 5432) para las
 * migraciones, porque el pooler en modo transacción no soporta DDL.
 */
const url = normalizeDatabaseUrl(process.env.DIRECT_URL || process.env.DATABASE_URL);

if (!url) {
  throw new Error(
    "Falta DATABASE_URL (o DIRECT_URL). Copiá .env.example a .env.local y completá la cadena de conexión.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: { url },
});
