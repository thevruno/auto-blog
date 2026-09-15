import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimit } from "@/lib/rate-limit";

const state = vi.hoisted(() => ({
  inserted: [] as Record<string, unknown>[],
  notified: false,
}));

vi.mock("@/db", () => ({
  db: {
    insert: () => ({
      values: async (values: Record<string, unknown>) => {
        state.inserted.push(values);
        return [values];
      },
    }),
  },
}));

vi.mock("@/lib/mailer", () => ({
  sendContactNotification: async () => state.notified,
}));

const { POST } = await import("@/app/api/contact/route");

function contactRequest(
  body: unknown,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest("http://localhost:3000/api/contact", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "localhost:3000",
      origin: "http://localhost:3000",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

const VALID = {
  name: "Elena",
  email: "elena@ejemplo.com",
  message: "Quería consultar por la capacitación de octubre.",
};

beforeEach(() => {
  state.inserted = [];
  state.notified = false;
  resetRateLimit();
});

describe("POST /api/contact", () => {
  it("rechaza pedidos de otro origen", async () => {
    const response = await POST(
      contactRequest(VALID, { origin: "https://malicioso.com" }),
    );
    expect(response.status).toBe(403);
    expect(state.inserted).toHaveLength(0);
  });

  it("exige nombre, email y mensaje", async () => {
    const response = await POST(contactRequest({ name: "", email: "", message: "" }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("Completá"),
    });
  });

  it("valida el formato del email", async () => {
    const response = await POST(contactRequest({ ...VALID, email: "no-es-email" }));
    expect(response.status).toBe(400);
  });

  it("rechaza un email demasiado largo", async () => {
    const response = await POST(
      contactRequest({ ...VALID, email: `${"a".repeat(250)}@ejemplo.com` }),
    );
    expect(response.status).toBe(400);
  });

  it("rechaza mensajes demasiado cortos", async () => {
    const response = await POST(contactRequest({ ...VALID, message: "hola" }));
    expect(response.status).toBe(400);
  });

  it("rechaza un nombre demasiado largo", async () => {
    const response = await POST(
      contactRequest({ ...VALID, name: "a".repeat(121) }),
    );
    expect(response.status).toBe(400);
    expect(state.inserted).toHaveLength(0);
  });

  it("rechaza un mensaje demasiado largo", async () => {
    const response = await POST(
      contactRequest({ ...VALID, message: "a".repeat(4001) }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("4000"),
    });
    expect(state.inserted).toHaveLength(0);
  });

  it("guarda el mensaje normalizado", async () => {
    const response = await POST(
      contactRequest({ name: "  Elena  ", email: " ELENA@Ejemplo.com ", message: `  ${VALID.message}  ` }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, notified: false });
    expect(state.inserted).toEqual([
      {
        name: "Elena",
        email: "elena@ejemplo.com",
        message: VALID.message,
      },
    ]);
  });

  it("informa si se pudo notificar por email", async () => {
    state.notified = true;
    const response = await POST(contactRequest(VALID));
    await expect(response.json()).resolves.toEqual({ ok: true, notified: true });
  });

  it("limita varios mensajes seguidos desde la misma IP", async () => {
    for (let i = 0; i < 5; i += 1) {
      expect((await POST(contactRequest(VALID))).status).toBe(200);
    }

    const blocked = await POST(contactRequest(VALID));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });

  it("el límite es por IP", async () => {
    const ip = { "x-forwarded-for": "198.51.100.10" };
    for (let i = 0; i < 5; i += 1) {
      await POST(contactRequest(VALID, ip));
    }

    expect((await POST(contactRequest(VALID, ip))).status).toBe(429);
    expect(
      (await POST(contactRequest(VALID, { "x-forwarded-for": "198.51.100.11" })))
        .status,
    ).toBe(200);
  });
});
