/**
 * Verificación del guardado de imágenes (Supabase Storage y modo local).
 *
 *   npm run check:storage
 *
 * Levanta un Supabase simulado (bucket + uploads) y comprueba que:
 *   - el bucket se crea solo si no existe,
 *   - el archivo se sube y devuelve la URL pública,
 *   - si Supabase falla, el error es claro,
 *   - sin SUPABASE_URL se usa la carpeta local y se puede leer el archivo.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import "./../src/db/env";

const PORT = 4615;
const BASE = `http://127.0.0.1:${PORT}`;
const BUCKET = "media-test";

let failures = 0;
const uploaded: { name: string; bytes: number; contentType: string }[] = [];
let bucketExists = false;
let failNextUpload = false;

function check(label: string, condition: boolean, detail = "") {
  console.log(`  ${condition ? "✔" : "✘"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures += 1;
}

function handler(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", BASE);
  const json = (status: number, body: unknown) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };

  if (req.url?.includes("/bucket/") && req.method === "GET") {
    return bucketExists ? json(200, { id: BUCKET, name: BUCKET, public: true }) : json(404, { message: "Bucket not found" });
  }

  if (url.pathname === "/storage/v1/bucket" && req.method === "POST") {
    bucketExists = true;
    return json(200, { name: BUCKET });
  }

  if (url.pathname.startsWith(`/storage/v1/object/${BUCKET}/`) && req.method === "POST") {
    if (failNextUpload) {
      failNextUpload = false;
      return json(403, { message: "new row violates row-level security policy" });
    }
    if (!bucketExists) return json(404, { message: "Bucket not found" });

    const name = url.pathname.split("/").pop() ?? "";
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk as Buffer));
    req.on("end", () => {
      uploaded.push({
        name,
        bytes: Buffer.concat(chunks).length,
        contentType: String(req.headers["content-type"] ?? ""),
      });
      json(200, { Key: `${BUCKET}/${name}` });
    });
    return;
  }

  json(404, { message: "not found" });
}

async function main() {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(PORT, "127.0.0.1", resolve));
  console.log(`\nSupabase simulado en ${BASE}\n`);

  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
    "base64",
  );

  try {
    // ---- Supabase Storage -------------------------------------------------
    process.env.SUPABASE_URL = BASE;
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-de-prueba";
    process.env.SUPABASE_STORAGE_BUCKET = BUCKET;

    const { saveUpload, storageMode, storageStatus } = await import(
      "../src/lib/storage"
    );

    console.log("1. Supabase Storage");
    check("Modo detectado como Supabase", storageMode() === "supabase", storageMode());
    check("El bucket todavía no existe en el simulador", bucketExists === false);

    const stored = await saveUpload({
      fileName: "foto.png",
      contentType: "image/png",
      buffer: png,
    });

    check("Crea el bucket automáticamente", bucketExists, `bucket=${BUCKET}`);
    check(
      "Sube el archivo y devuelve la URL pública",
      stored.storage === "supabase" &&
        stored.url === `${BASE}/storage/v1/object/public/${BUCKET}/${stored.name}`,
      stored.url,
    );
    check(
      "Conserva el contenido y el tipo",
      uploaded[0]?.bytes === png.length && uploaded[0]?.contentType === "image/png",
      `${uploaded[0]?.bytes} bytes · ${uploaded[0]?.contentType}`,
    );

    // El tipo se valida por los bytes del archivo (ver src/lib/image-file.ts):
    // un tipo fuera de la lista blanca no se guarda.
    let rejected = "";
    try {
      await saveUpload({
        fileName: "raro.bin",
        contentType: "application/octet-stream",
        buffer: Buffer.from("x"),
      });
    } catch (error) {
      rejected = error instanceof Error ? error.message : String(error);
    }
    check(
      "Rechaza un tipo que no está en la lista permitida",
      rejected.includes("no permitido"),
      rejected,
    );

    failNextUpload = true;
    let errorMessage = "";
    try {
      await saveUpload({
        fileName: "foto.png",
        contentType: "image/png",
        buffer: png,
      });
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }
    check(
      "Informa con claridad si Supabase rechaza el archivo",
      errorMessage.includes("Supabase Storage"),
      errorMessage,
    );

    const status = await storageStatus();
    check("El diagnóstico reporta todo listo", status.ok, status.detail);

    // ---- Modo local -------------------------------------------------------
    console.log("\n2. Modo local (sin Supabase)");
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const local = await import("../src/lib/storage");
    check("Vuelve al modo local", local.storageMode() === "local");

    const localFile = await local.saveUpload({
      fileName: "local.png",
      contentType: "image/png",
      buffer: png,
    });
    check(
      "Guarda en /api/uploads/<archivo>",
      localFile.url.startsWith("/api/uploads/") && localFile.storage === "local",
      localFile.url,
    );

    const diskPath = path.join(
      process.cwd(),
      "storage",
      "uploads",
      localFile.name,
    );
    const onDisk = await readFile(diskPath);
    check("El archivo quedó en disco", onDisk.length === png.length, diskPath);
    await rm(diskPath, { force: true });
  } catch (error) {
    console.error("\nError inesperado en la verificación:", error);
    failures += 1;
  } finally {
    server.close();
    console.log(
      failures === 0
        ? "\nTodo OK ✅\n"
        : `\n${failures} verificación(es) fallaron ❌\n`,
    );
    process.exitCode = failures === 0 ? 0 : 1;
  }
}

main();
