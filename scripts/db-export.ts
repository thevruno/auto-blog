/**
 * Exporta todo el contenido a un archivo portable.
 *
 *   npm run db:export                     → scripts/data/content.json
 *   npm run db:export -- ruta/otro.json   → otro destino
 *
 * Sirve para llevar el contenido a Supabase desde una máquina que no tiene
 * acceso a la base de origen: se versiona (o se copia) el JSON y se carga con
 * `npm run db:import`.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import "../src/db/env";
import { describeUrl, dumpToJson } from "../src/lib/db-transfer";

const DEFAULT_FILE = path.join("scripts", "data", "content.json");

async function main() {
  const url = process.env.SOURCE_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
  if (!url) {
    throw new Error("Falta DATABASE_URL (o SOURCE_DATABASE_URL) para exportar.");
  }

  const file = process.argv[2] ?? process.env.EXPORT_FILE ?? DEFAULT_FILE;
  await mkdir(path.dirname(file), { recursive: true });

  const { dump, report } = await dumpToJson(url, file);

  console.log("\n=== Exportación ===");
  console.log(`Origen:  ${describeUrl(url)}`);
  console.log(`Archivo: ${file}`);
  console.log(`Fecha:   ${dump.generatedAt}\n`);

  for (const item of report) {
    console.log(`  ${item.table.padEnd(18)} ${String(item.source).padStart(4)} filas`);
  }

  const total = report.reduce((sum, item) => sum + item.source, 0);
  console.log(`\n${total} fila(s) exportadas ✅`);
  console.log("Para cargarlas en otra base: npm run db:import\n");
}

main().catch((error) => {
  console.error("\n✘ No se pudo exportar:\n");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
