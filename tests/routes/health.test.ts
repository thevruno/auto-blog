import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  session: null as Record<string, unknown> | null,
  dbFails: false,
  storageOk: true,
}));

vi.mock("@/db", () => ({
  db: {
    execute: async () => {
      if (state.dbFails) {
        throw new Error(
          "connect ECONNREFUSED 10.0.0.5:5432 (user=postgres password=secreto)",
        );
      }
      return [];
    },
  },
}));

vi.mock("@/lib/admin", () => ({
  requireAdmin: async () => state.session,
}));

vi.mock("@/lib/storage", () => ({
  storageStatus: async () => ({
    mode: "supabase",
    bucket: "media",
    ok: state.storageOk,
    detail: state.storageOk ? "Bucket listo" : "Falta la service role key",
  }),
}));

const { GET } = await import("@/app/api/health/route");

beforeEach(() => {
  state.session = null;
  state.dbFails = false;
  state.storageOk = true;
});

describe("GET /api/health", () => {
  it("informa el estado cuando todo anda", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      database: true,
      storage: { mode: "supabase", bucket: "media", ok: true },
    });
  });

  it("no cachea la respuesta", async () => {
    const response = await GET();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("no filtra detalles del storage al público", async () => {
    state.storageOk = false;
    const payload = (await (await GET()).json()) as {
      storage: Record<string, unknown>;
    };
    expect(payload.storage).toEqual({ mode: "supabase", bucket: "media", ok: false });
    expect(payload.storage.detail).toBeUndefined();
  });

  it("muestra el detalle del storage a un administrador", async () => {
    state.session = { userId: 1 };
    state.storageOk = false;
    const payload = (await (await GET()).json()) as {
      storage: Record<string, unknown>;
    };
    expect(payload.storage.detail).toBe("Falta la service role key");
  });

  it("no expone el error interno de la base al público", async () => {
    state.dbFails = true;
    const response = await GET();
    expect(response.status).toBe(500);

    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload).toEqual({ ok: false, database: false });
    expect(JSON.stringify(payload)).not.toContain("secreto");
    expect(JSON.stringify(payload)).not.toContain("password");
  });

  it("muestra el error de la base a un administrador", async () => {
    state.session = { userId: 1 };
    state.dbFails = true;
    const payload = (await (await GET()).json()) as Record<string, unknown>;
    expect(String(payload.error)).toContain("ECONNREFUSED");
  });
});
