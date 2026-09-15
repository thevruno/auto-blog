import { readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_IMAGE_BYTES } from "@/lib/image-file";

const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);
const UPLOADS_DIR = path.join(process.cwd(), "storage", "uploads");

const createdFiles: string[] = [];

async function removeCreatedFiles() {
  for (const name of createdFiles) {
    await rm(path.join(UPLOADS_DIR, name), { force: true });
  }
  createdFiles.length = 0;
}

function useLocalStorage() {
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function useSupabaseStorage() {
  process.env.SUPABASE_URL = "https://proyecto.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-de-prueba";
  process.env.SUPABASE_STORAGE_BUCKET = "media";
}

beforeEach(() => {
  // El módulo cachea la promesa de creación del bucket, así que cada test
  // arranca con una instancia limpia.
  vi.resetModules();
  useLocalStorage();
});

afterEach(async () => {
  await removeCreatedFiles();
  useLocalStorage();
  vi.unstubAllGlobals();
});

describe("helpers", () => {
  it("randomFileName usa la extensión y un nombre aleatorio", async () => {
    const { randomFileName } = await import("@/lib/storage");
    const name = randomFileName(".png");
    expect(name).toMatch(/^[0-9a-f]{20}\.png$/);
    expect(randomFileName(".png")).not.toBe(name);
  });

  it("publicUrlOf arma la URL pública del bucket", async () => {
    useSupabaseStorage();
    const { publicUrlOf } = await import("@/lib/storage");
    expect(publicUrlOf("foto.png")).toBe(
      "https://proyecto.supabase.co/storage/v1/object/public/media/foto.png",
    );
  });

  it("detecta el modo según las variables de entorno", async () => {
    const { storageMode } = await import("@/lib/storage");
    useLocalStorage();
    expect(storageMode()).toBe("local");
    useSupabaseStorage();
    expect(storageMode()).toBe("supabase");
  });
});

describe("saveUpload en modo local", () => {
  it("guarda el archivo y devuelve la URL de /api/uploads", async () => {
    const { saveUpload } = await import("@/lib/storage");
    const stored = await saveUpload({
      fileName: "foto.png",
      contentType: "image/png",
      buffer: PNG,
    });
    createdFiles.push(stored.name);

    expect(stored.storage).toBe("local");
    expect(stored.url).toBe(`/api/uploads/${stored.name}`);
    expect(stored.name.endsWith(".png")).toBe(true);

    const written = await readFile(path.join(UPLOADS_DIR, stored.name));
    expect(written.equals(PNG)).toBe(true);
  });

  it("rechaza un tipo que no está en la lista permitida", async () => {
    const { saveUpload } = await import("@/lib/storage");
    await expect(
      saveUpload({
        fileName: "pagina.html",
        contentType: "text/html",
        buffer: Buffer.from("<h1>hola</h1>"),
      }),
    ).rejects.toThrow(/no permitido/i);
  });

  it("no usa la extensión del nombre para decidir el archivo", async () => {
    const { saveUpload } = await import("@/lib/storage");
    const stored = await saveUpload({
      fileName: "foto.html",
      contentType: "image/png",
      buffer: PNG,
    });
    createdFiles.push(stored.name);
    expect(stored.name.endsWith(".png")).toBe(true);
  });

  it("rechaza lo que supera el máximo de 5 MB", async () => {
    const { saveUpload } = await import("@/lib/storage");
    const big = Buffer.alloc(MAX_IMAGE_BYTES + 1);
    await expect(
      saveUpload({ fileName: "grande.png", contentType: "image/png", buffer: big }),
    ).rejects.toThrow(/5 MB/);
  });
});

describe("saveUpload en modo Supabase", () => {
  it("crea el bucket si no existe y sube el archivo", async () => {
    useSupabaseStorage();
    const calls: { url: string; method: string }[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL, init?: RequestInit) => {
        const target = String(url);
        calls.push({ url: target, method: init?.method ?? "GET" });

        if (target.includes("/storage/v1/bucket/media") && !init?.method) {
          return new Response("", { status: 404 });
        }
        if (target.endsWith("/storage/v1/bucket") && init?.method === "POST") {
          return new Response(JSON.stringify({ name: "media" }), { status: 200 });
        }
        return new Response(JSON.stringify({ Key: "media/foto.png" }), { status: 200 });
      }),
    );

    const { saveUpload } = await import("@/lib/storage");
    const stored = await saveUpload({
      fileName: "foto.png",
      contentType: "image/png",
      buffer: PNG,
    });

    expect(stored.storage).toBe("supabase");
    expect(stored.url).toContain("/storage/v1/object/public/media/");
    expect(calls.some((call) => call.method === "POST" && call.url.endsWith("/storage/v1/bucket"))).toBe(
      true,
    );
    expect(
      calls.some((call) => call.method === "POST" && call.url.includes("/storage/v1/object/media/")),
    ).toBe(true);
  });

  it("convierte un error de Supabase en un mensaje claro", async () => {
    useSupabaseStorage();

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL, init?: RequestInit) => {
        const target = String(url);
        if (target.includes("/bucket/media") && !init?.method) {
          return new Response(JSON.stringify({ name: "media" }), { status: 200 });
        }
        return new Response(JSON.stringify({ message: "bucket not found" }), {
          status: 404,
        });
      }),
    );

    const { saveUpload } = await import("@/lib/storage");
    await expect(
      saveUpload({ fileName: "foto.png", contentType: "image/png", buffer: PNG }),
    ).rejects.toThrow(/Supabase Storage rechazó el archivo/i);
  });
});

describe("storageStatus", () => {
  it("informa el modo local sin configuración", async () => {
    const { storageStatus } = await import("@/lib/storage");
    const status = await storageStatus();
    expect(status).toMatchObject({ mode: "local", bucket: null, ok: true });
  });

  it("marca ok:false y explica el problema cuando Supabase falla", async () => {
    useSupabaseStorage();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );

    const { storageStatus } = await import("@/lib/storage");
    const status = await storageStatus();
    expect(status.ok).toBe(false);
    expect(status.mode).toBe("supabase");
    expect(status.detail).toContain("ECONNREFUSED");
  });
});

describe("guardado en disco", () => {
  it("la carpeta de uploads no se versiona", async () => {
    const { saveUpload } = await import("@/lib/storage");
    const stored = await saveUpload({
      fileName: "foto.png",
      contentType: "image/png",
      buffer: PNG,
    });
    createdFiles.push(stored.name);

    const info = await stat(path.join(UPLOADS_DIR, stored.name));
    expect(info.isFile()).toBe(true);
  });
});
