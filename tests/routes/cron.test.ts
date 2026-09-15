import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimit } from "@/lib/rate-limit";

const state = vi.hoisted(() => ({
  runs: 0,
}));

vi.mock("@/lib/discovery/search", () => ({
  runAllTopics: async () => {
    state.runs += 1;
    return [
      {
        topicId: 3,
        label: "Altas capacidades",
        result: {
          inserted: 2,
          known: 5,
          providers: [{ provider: "google-news", ok: true, kept: 2 }],
        },
      },
    ];
  },
}));

vi.mock("@/lib/discovery/list", () => ({
  listLeads: async () => ({ counts: { open: 4 } }),
}));

const { GET, POST } = await import("@/app/api/cron/discovery/route");

const KEY = "clave-de-cron-de-prueba";

function cronRequest(
  query = "",
  headers: Record<string, string> = {},
  method: "GET" | "POST" = "POST",
): NextRequest {
  return new NextRequest(`http://localhost:3000/api/cron/discovery${query}`, {
    method,
    headers: { host: "localhost:3000", ...headers },
  });
}

const originalKey = process.env.DISCOVERY_CRON_KEY;

beforeEach(() => {
  state.runs = 0;
  resetRateLimit();
  process.env.DISCOVERY_CRON_KEY = KEY;
});

afterEach(() => {
  if (originalKey === undefined) delete process.env.DISCOVERY_CRON_KEY;
  else process.env.DISCOVERY_CRON_KEY = originalKey;
});

describe("POST /api/cron/discovery", () => {
  it("queda cerrado si no hay clave configurada", async () => {
    delete process.env.DISCOVERY_CRON_KEY;
    const response = await POST(cronRequest(`?key=${KEY}`));
    expect(response.status).toBe(503);
    expect(state.runs).toBe(0);
  });

  it("rechaza una clave inválida", async () => {
    const response = await POST(cronRequest("?key=otra-clave"));
    expect(response.status).toBe(401);
    expect(state.runs).toBe(0);
  });

  it("rechaza cuando no se envía ninguna clave", async () => {
    expect((await POST(cronRequest())).status).toBe(401);
    expect(state.runs).toBe(0);
  });

  it("acepta la clave por cabecera", async () => {
    const response = await POST(cronRequest("", { "x-cron-key": KEY }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      pendientes: 4,
      topics: [{ topicId: 3, label: "Altas capacidades", inserted: 2, known: 5 }],
    });
    expect(state.runs).toBe(1);
  });

  it("acepta la clave por query string", async () => {
    const response = await POST(cronRequest(`?key=${KEY}`));
    expect(response.status).toBe(200);
    expect(state.runs).toBe(1);
  });

  it("también responde al GET", async () => {
    const response = await GET(cronRequest("", { "x-cron-key": KEY }, "GET"));
    expect(response.status).toBe(200);
  });

  it("limita los rastreos seguidos desde la misma IP", async () => {
    for (let i = 0; i < 6; i += 1) {
      expect((await POST(cronRequest("", { "x-cron-key": KEY }))).status).toBe(200);
    }

    const blocked = await POST(cronRequest("", { "x-cron-key": KEY }));
    expect(blocked.status).toBe(429);
    expect(state.runs).toBe(6);
  });

  it("una clave incorrecta no consume el límite de otra IP", async () => {
    const response = await POST(
      cronRequest("", { "x-cron-key": KEY, "x-forwarded-for": "203.0.113.5" }),
    );
    expect(response.status).toBe(200);
  });
});
