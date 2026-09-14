import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

/**
 * Guardado de las imágenes que se suben desde el panel.
 *
 * - Con `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` configurados, los archivos
 *   van a **Supabase Storage** (bucket público) y se sirven por CDN. El bucket
 *   se crea solo la primera vez si no existe.
 * - Sin esas variables, se guardan en `storage/uploads` del servidor
 *   (comportamiento original, ideal para desarrollo).
 */
export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "image/avif": ".avif",
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type StorageMode = "supabase" | "local";

export interface StoredFile {
  url: string;
  name: string;
  storage: StorageMode;
}

const supabaseUrl = () => (process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
const serviceRoleKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const bucketName = () => process.env.SUPABASE_STORAGE_BUCKET ?? "media";

export function storageMode(): StorageMode {
  return supabaseUrl() && serviceRoleKey() ? "supabase" : "local";
}

export function randomFileName(ext: string): string {
  return `${randomBytes(10).toString("hex")}${ext}`;
}

export function publicUrlOf(name: string): string {
  return `${supabaseUrl()}/storage/v1/object/public/${bucketName()}/${name}`;
}

async function supabaseFetch(
  endpoint: string,
  init: RequestInit = {},
): Promise<Response> {
  const response = await fetch(`${supabaseUrl()}${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${serviceRoleKey()}`,
      apikey: serviceRoleKey(),
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
  return response;
}

async function errorMessage(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  try {
    const parsed = JSON.parse(text) as { message?: string; error?: string };
    return parsed.message ?? parsed.error ?? text.slice(0, 200);
  } catch {
    return text.slice(0, 200) || `${response.status}`;
  }
}

let bucketReady: Promise<void> | null = null;

/** Crea el bucket público si todavía no existe (idempotente por proceso). */
export function ensureBucket(): Promise<void> {
  if (storageMode() !== "supabase") return Promise.resolve();
  if (!bucketReady) {
    bucketReady = (async () => {
      const head = await supabaseFetch(`/storage/v1/bucket/${bucketName()}`);
      if (head.ok) return;

      const body = {
        id: bucketName(),
        name: bucketName(),
        public: true,
        file_size_limit: MAX_UPLOAD_BYTES,
        allowed_mime_types: Object.keys(ALLOWED_IMAGE_TYPES),
      };

      const created = await supabaseFetch("/storage/v1/bucket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // 409 = ya existe (creado por otra instancia en paralelo).
      if (!created.ok && created.status !== 409) {
        throw new Error(
          `No se pudo preparar el bucket «${bucketName()}» en Supabase: ${await errorMessage(created)}`,
        );
      }
    })().catch((error) => {
      bucketReady = null;
      throw error;
    });
  }
  return bucketReady;
}

async function uploadToSupabase(
  name: string,
  buffer: Buffer,
  contentType: string,
): Promise<StoredFile> {
  await ensureBucket();

  const endpoint = `/storage/v1/object/${bucketName()}/${name}`;
  const upload = () =>
    supabaseFetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "x-upsert": "true",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      body: new Uint8Array(buffer),
    });

  let response = await upload();
  let detail = response.ok ? "" : await errorMessage(response);

  // El bucket puede haber sido borrado después de la verificación inicial.
  if (!response.ok && /bucket not found/i.test(detail)) {
    bucketReady = null;
    await ensureBucket();
    response = await upload();
    detail = response.ok ? "" : await errorMessage(response);
  }

  if (!response.ok) {
    throw new Error(`Supabase Storage rechazó el archivo: ${detail}`);
  }

  return { url: publicUrlOf(name), name, storage: "supabase" };
}

async function uploadToLocal(
  name: string,
  buffer: Buffer,
): Promise<StoredFile> {
  const dir = path.join(process.cwd(), "storage", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), buffer);
  return { url: `/api/uploads/${name}`, name, storage: "local" };
}

export interface UploadInput {
  fileName: string;
  contentType: string;
  buffer: Buffer;
}

export async function saveUpload({
  fileName,
  contentType,
  buffer,
}: UploadInput): Promise<StoredFile> {
  const ext =
    ALLOWED_IMAGE_TYPES[contentType] ??
    (path.extname(fileName).toLowerCase() || ".bin");
  const name = randomFileName(ext);

  if (storageMode() === "supabase") {
    return uploadToSupabase(name, buffer, contentType);
  }
  return uploadToLocal(name, buffer);
}

/** Estado del almacenamiento, para diagnóstico en `/api/health` y scripts. */
export async function storageStatus(): Promise<{
  mode: StorageMode;
  bucket: string | null;
  ok: boolean;
  detail: string;
}> {
  if (storageMode() !== "supabase") {
    return {
      mode: "local",
      bucket: null,
      ok: true,
      detail: "Guardado local en storage/uploads (sin Supabase Storage configurado).",
    };
  }

  try {
    await ensureBucket();
    return {
      mode: "supabase",
      bucket: bucketName(),
      ok: true,
      detail: `Supabase Storage listo (bucket «${bucketName()}»).`,
    };
  } catch (error) {
    return {
      mode: "supabase",
      bucket: bucketName(),
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}
