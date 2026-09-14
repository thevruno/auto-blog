/**
 * Carga en la base destino el contenido exportado con `npm run db:export`.
 *
 *   npm run db:import                          → scripts/data/content.json
 *   npm run db:import -- ruta/otro.json        → otro archivo
 *
 * El destino es `DIRECT_URL` (o `DATABASE_URL`) y tiene que existir el esquema:
 * corré antes `npm run db:push`. Las tablas del destino se reemplazan.
 */
import path from "node:path";
import "../src/db/env";
import { describeUrl, loadFromJson } from "../src/lib/db-transfer";

const DEFAULT_FILE = path.join("scripts", "data", "content.json");

async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";
  if (!url) {
    throw new Error("Falta DATABASE_URL o DIRECT_URL en .env.local (destino).");
  }

  const file = process.argv[2] ?? process.env.IMPORT_FILE ?? DEFAULT_FILE;
  const dryRun = ["1", "true", "yes"].includes(
    (process.env.DRY_RUN ?? "").toLowerCase(),
  );

  const { dump, report } = await loadFromJson(url, file, { dryRun });

  console.log("\n=== Importación ===");
  console.log(`Archivo: ${file}`);
  console.log(`Exportado: ${dump.generatedAt} desde ${dump.source}`);
  console.log(`Destino: ${describeUrl(url)}`);
  if (dryRun) console.log("Modo:    DRY_RUN (no se escribe nada)");

  console.log("\n=== Resultado ===");
  for (const item of report) {
    const icon = item.target === item.source ? "✔" : "✘";
    console.log(
      `  ${icon} ${item.table.padEnd(18)} archivo ${String(item.source).padStart(
        4,
      )}  destino ${String(item.target).padStart(4)}`,
    );
  }

  const mismatches = report.filter((item) => item.target !== item.source);
  console.log(
    mismatches.length === 0
      ? dryRun
        ? "\nSimulación OK ✅\n"
        : "\nContenido cargado ✅  Verificalo con: npm run db:verify\n"
      : `\nAtención: ${mismatches.length} tabla(s) no coinciden ❌\n`,
  );
  process.exitCode = mismatches.length === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error("\n✘ No se pudo importar:\n");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
