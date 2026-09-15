import { afterEach, describe, expect, it, vi } from "vitest";
import {
  rateLimit,
  resetRateLimit,
  tooManyRequestsResponse,
} from "@/lib/rate-limit";

afterEach(() => {
  resetRateLimit();
});

describe("rateLimit", () => {
  it("permite los primeros intentos y descuenta los que quedan", () => {
    const options = { limit: 3, windowMs: 60_000 };

    expect(rateLimit("k", options)).toEqual({
      ok: true,
      remaining: 2,
      retryAfterSeconds: 0,
    });
    expect(rateLimit("k", options).remaining).toBe(1);
    expect(rateLimit("k", options).remaining).toBe(0);
  });

  it("bloquea al superar el límite", () => {
    const options = { limit: 2, windowMs: 60_000 };
    rateLimit("k", options);
    rateLimit("k", options);

    const blocked = rateLimit("k", options);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("informa los segundos que faltan para reintentar", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      const options = { limit: 1, windowMs: 30_000 };
      rateLimit("k", options);

      // 10 segundos después sigue bloqueado, con 20 por delante.
      vi.setSystemTime(new Date("2026-01-01T00:00:10Z"));
      expect(rateLimit("k", options).retryAfterSeconds).toBe(20);
    } finally {
      vi.useRealTimers();
    }
  });

  it("vuelve a permitir cuando expira la ventana", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      const options = { limit: 1, windowMs: 1_000 };
      rateLimit("k", options);
      expect(rateLimit("k", options).ok).toBe(false);

      vi.setSystemTime(new Date("2026-01-01T00:00:02Z"));
      expect(rateLimit("k", options).ok).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("cuenta cada clave por separado", () => {
    const options = { limit: 1, windowMs: 60_000 };
    expect(rateLimit("a", options).ok).toBe(true);
    expect(rateLimit("a", options).ok).toBe(false);
    expect(rateLimit("b", options).ok).toBe(true);
  });

  it("resetRateLimit limpia una clave o todo el estado", () => {
    const options = { limit: 1, windowMs: 60_000 };
    rateLimit("a", options);
    rateLimit("b", options);

    resetRateLimit("a");
    expect(rateLimit("a", options).ok).toBe(true);
    expect(rateLimit("b", options).ok).toBe(false);

    resetRateLimit();
    expect(rateLimit("b", options).ok).toBe(true);
  });
});

describe("tooManyRequestsResponse", () => {
  it("responde 429 con Retry-After y mensaje", async () => {
    const response = tooManyRequestsResponse(42);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    await expect(response.json()).resolves.toEqual({
      error: "Demasiados intentos. Esperá unos minutos y probá de nuevo.",
    });
  });

  it("normaliza los segundos mínimos a 1", async () => {
    const response = tooManyRequestsResponse(0);
    expect(response.headers.get("Retry-After")).toBe("1");
  });

  it("acepta un mensaje propio", async () => {
    const response = tooManyRequestsResponse(5, "Pará un poco");
    await expect(response.json()).resolves.toEqual({ error: "Pará un poco" });
  });
});
