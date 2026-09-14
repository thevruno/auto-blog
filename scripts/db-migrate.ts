/**
 * Copia el contenido de una base a otra (por ejemplo, de la base local de
 * desarrollo a Supabase).
 *
 *   SOURCE_DATABASE_URL=postgresql://…local…  npm run db:migrate
 *
 * - El destino es `DIRECT_URL` (o `DATABASE_URL`) y debe tener el esquema
 *   creado: corré antes `npm run db:push`.
 * - El origen por defecto es la `DATABASE_URL` de `.env.development.local`
 *   (la base local), salvo que definas `SOURCE_DATABASE_URL` / `MIGRATE_FROM`.
 * - `DRY_RUN=1` muestra qué haría sin escribir nada.
 * - `TABLES=posts,media_items` limita la copia a algunas tablas.
 *
 * Si el origen no es accesible desde esta máquina, usá `npm run db:export`
 * (genera `scripts/data/content.json`) y después `npm run db:import`.
 */
import { readFileSync } from "node:fs";
import { parse as parseEnv } from "dotenv";
import "../src/db/env";
import { TABLES, describeUrl, transferBetween } from "../src/lib/db-transfer";

function localDatabaseUrl(): string | undefined {
  try {
    const parsed = parseEnv(readFileSync(".env.development.local", "utf8"));
    return parsed.DATABASE_URL;
  } catch {
    return undefined;
  }
}

async function main() {
  const target = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";
  const source =
    process.env.SOURCE_DATABASE_URL ??
    process.env.MIGRATE_FROM ??
    localDatabaseUrl() ??
    "";

  if (!target) {
    throw new Error("Falta DATABASE_URL o DIRECT_URL en .env.local (destino).");
  }
  if (!source) {
    throw new Error(
      "Falta el origen: definí SOURCE_DATABASE_URL o poné la base local en .env.development.local.",
    );
  }
  if (source.replace(/\s/g, "") === target.replace(/\s/g, "")) {
    throw new Error("Origen y destino son la misma base: no hay nada que copiar.");
  }

  const dryRun = ["1", "true", "yes"].includes(
    (process.env.DRY_RUN ?? "").toLowerCase(),
  );
  const selected = (process.env.TABLES ?? "")
    .split(",")
    .map((table) => table.trim())
    .filter(Boolean);
  const tables = selected.length > 0 ? selected : TABLES;

  console.log("\n=== Migración de contenido ===");
  console.log(`Origen:  ${describeUrl(source)}`);
  console.log(`Destino: ${describeUrl(target)}`);
  if (dryRun) console.log("Modo:    DRY_RUN (no se escribe nada)");

  const report = await transferBetween(source, target, { tables, dryRun });

  console.log("\n=== Resultado ===");
  for (const item of report) {
    const icon = item.target === item.source ? "✔" : "✘";
    console.log(
      `  ${icon} ${item.table.padEnd(18)} origen ${String(item.source).padStart(
        4,
      )}  destino ${String(item.target).padStart(4)}`,
    );
  }

  const mismatches = report.filter((item) => item.target !== item.source);
  console.log(
    mismatches.length === 0
      ? dryRun
        ? "\nSimulación OK: todo listo para copiar ✅\n"
        : "\nMigración completa ✅\n"
      : `\nAtención: ${mismatches.length} tabla(s) no coinciden ❌\n`,
  );
  process.exitCode = mismatches.length === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error("\n✘ No se pudo migrar el contenido:\n");
  console.error(error instanceof Error ? error.message : error);
  console.error(
    "\nRevisá que el destino tenga el esquema (`npm run db:push`) y la conexión.",
  );
  process.exitCode = 1;
});
