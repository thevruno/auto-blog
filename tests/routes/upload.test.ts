import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_IMAGE_BYTES } from "@/lib/image-file";
import { resetRateLimit } from "@/lib/rate-limit";

const state = vi.hoisted(() => ({
  session: { userId: 1, email: "admin@ejemplo.com", name: "Admin" } as
    | Record<string, unknown>
    | null,
  saved: [] as { fileName: string; contentType: string; bytes: number }[],
  failWith: null as string | null,
}));

vi.mock("@/lib/admin", () => ({
  requireAdmin: async () => state.session,
}));

vi.mock("@/lib/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storage")>();
  return {
    ...actual,
    storageMode: () => "local",
    saveUpload: async (input: {
      fileName: string;
      contentType: string;
      buffer: Buffer;
    }) => {
      if (state.failWith) throw new Error(state.failWith);
      state.saved.push({
        fileName: input.fileName,
        contentType: input.contentType,
        bytes: input.buffer.length,
      });
      return {
        url: `/api/uploads/prueba${actual.ALLOWED_IMAGE_TYPES[input.contentType]}`,
        name: `prueba${actual.ALLOWED_IMAGE_TYPES[input.contentType]}`,
        storage: "local" as const,
      };
    },
  };
});

const { POST } = await import("@/app/api/upload/route");

const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);
const SVG = new TextEncoder().encode(`<svg xmlns="http://www.w3.org/2000/svg"/>`);
const HTML = new TextEncoder().encode(`<html><body>hola</body></html>`);

function uploadRequest(
  content: Uint8Array | null,
  options: { name?: string; type?: string; headers?: Record<string, string> } = {},
): NextRequest {
  const form = new FormData();
  if (content) {
    form.append(
      "file",
      new File([content as BlobPart], options.name ?? "foto.png", {
        type: options.type ?? "image/png",
      }),
    );
  }

  return new NextRequest("http://localhost:3000/api/upload", {
    method: "POST",
    headers: { host: "localhost:3000", origin: "http://localhost:3000", ...options.headers },
    body: form,
  });
}

beforeEach(() => {
  state.session = { userId: 1, email: "admin@ejemplo.com", name: "Admin" };
  state.saved = [];
  state.failWith = null;
  resetRateLimit();
});

describe("POST /api/upload", () => {
  it("exige sesión de administrador", async () => {
    state.session = null;
    const response = await POST(uploadRequest(PNG));
    expect(response.status).toBe(401);
  });

  it("rechaza pedidos de otro origen", async () => {
    const response = await POST(
      uploadRequest(PNG, { headers: { origin: "https://malicioso.com" } }),
    );
    expect(response.status).toBe(403);
    expect(state.saved).toHaveLength(0);
  });

  it("exige que venga un archivo", async () => {
    const response = await POST(uploadRequest(null));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("archivo"),
    });
  });

  it("guarda una imagen válida y devuelve la URL", async () => {
    const response = await POST(uploadRequest(PNG));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      url: "/api/uploads/prueba.png",
      name: "prueba.png",
      storage: "local",
      type: "image/png",
    });
    expect(state.saved).toEqual([
      { fileName: "foto.png", contentType: "image/png", bytes: PNG.length },
    ]);
  });

  it("guarda según el contenido y no según el nombre o el Content-Type", async () => {
    const response = await POST(
      uploadRequest(PNG, { name: "disfraz.jpg", type: "image/jpeg" }),
    );
    expect(response.status).toBe(200);
    expect(state.saved[0].contentType).toBe("image/png");
  });

  it("rechaza HTML que se hace pasar por imagen", async () => {
    const response = await POST(uploadRequest(HTML, { name: "foto.png" }));
    expect(response.status).toBe(400);
    expect(state.saved).toHaveLength(0);
  });

  it("rechaza SVG", async () => {
    const response = await POST(
      uploadRequest(SVG, { name: "icono.svg", type: "image/svg+xml" }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("SVG"),
    });
    expect(state.saved).toHaveLength(0);
  });

  it("rechaza archivos que superan los 5 MB sin leerlos", async () => {
    const big = new Uint8Array(MAX_IMAGE_BYTES + 1);
    big.set(PNG.subarray(0, 8));

    const response = await POST(uploadRequest(big));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("5 MB"),
    });
    expect(state.saved).toHaveLength(0);
  });

  it("devuelve 500 con el mensaje del storage cuando falla el guardado", async () => {
    state.failWith = "Supabase Storage rechazó el archivo: sin permisos";
    const response = await POST(uploadRequest(PNG));
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("Supabase Storage"),
      storage: "local",
    });
  });

  it("limita la cantidad de subidas seguidas por cuenta", async () => {
    for (let i = 0; i < 30; i += 1) {
      expect((await POST(uploadRequest(PNG))).status).toBe(200);
    }
    const blocked = await POST(uploadRequest(PNG));
    expect(blocked.status).toBe(429);
  });
});
