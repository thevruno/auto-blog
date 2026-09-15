import { describe, expect, it } from "vitest";
import {
  clientIp,
  crossOriginResponse,
  isSameOrigin,
  safeEqualString,
} from "@/lib/security";

function requestWith(headers: Record<string, string>, url = "https://sitio.com/api") {
  return new Request(url, { headers });
}

describe("safeEqualString", () => {
  it("considera iguales dos strings idénticos", () => {
    expect(safeEqualString("clave-secreta", "clave-secreta")).toBe(true);
  });

  it("rechaza strings distintos del mismo largo", () => {
    expect(safeEqualString("clave-secreta", "clave-secretb")).toBe(false);
  });

  it("rechaza strings de distinto largo sin lanzar", () => {
    expect(safeEqualString("corta", "mucho-mas-larga")).toBe(false);
  });

  it("considera iguales dos strings vacíos", () => {
    expect(safeEqualString("", "")).toBe(true);
  });

  it("no se rompe con acentos ni emojis", () => {
    expect(safeEqualString("contraseña-ñ", "contraseña-ñ")).toBe(true);
    expect(safeEqualString("contraseña-ñ", "contrasena-n")).toBe(false);
  });
});

describe("clientIp", () => {
  it("toma la primera IP de x-forwarded-for", () => {
    const req = requestWith({ "x-forwarded-for": "203.0.113.7, 10.0.0.1, 10.0.0.2" });
    expect(clientIp(req)).toBe("203.0.113.7");
  });

  it("limpia los espacios alrededor de la IP", () => {
    const req = requestWith({ "x-forwarded-for": "   203.0.113.7  ,10.0.0.1" });
    expect(clientIp(req)).toBe("203.0.113.7");
  });

  it("usa x-real-ip cuando no hay x-forwarded-for", () => {
    const req = requestWith({ "x-real-ip": "198.51.100.4" });
    expect(clientIp(req)).toBe("198.51.100.4");
  });

  it("devuelve un valor fijo cuando no hay cabeceras", () => {
    expect(clientIp(requestWith({}))).toBe("desconocida");
  });
});

describe("isSameOrigin", () => {
  it("permite los pedidos sin Origin (curl, cron, server-side)", () => {
    expect(isSameOrigin(requestWith({ host: "sitio.com" }))).toBe(true);
  });

  it("permite el Origin del propio host", () => {
    const req = requestWith({ origin: "https://sitio.com", host: "sitio.com" });
    expect(isSameOrigin(req)).toBe(true);
  });

  it("permite el host con puerto", () => {
    const req = requestWith({
      origin: "http://localhost:3000",
      host: "localhost:3000",
    });
    expect(isSameOrigin(req)).toBe(true);
  });

  it("rechaza un Origin de otro dominio", () => {
    const req = requestWith({ origin: "https://malicioso.com", host: "sitio.com" });
    expect(isSameOrigin(req)).toBe(false);
  });

  it("rechaza un Origin que sólo comparte el sufijo", () => {
    const req = requestWith({
      origin: "https://sitio.com.malicioso.com",
      host: "sitio.com",
    });
    expect(isSameOrigin(req)).toBe(false);
  });

  it("rechaza un Origin inválido", () => {
    const req = requestWith({ origin: "no-es-una-url", host: "sitio.com" });
    expect(isSameOrigin(req)).toBe(false);
  });

  it("rechaza cuando hay Origin pero no Host", () => {
    const req = new Request("https://sitio.com/api", {
      headers: { origin: "https://sitio.com" },
    });
    expect(isSameOrigin(req)).toBe(false);
  });
});

describe("crossOriginResponse", () => {
  it("responde 403 con un mensaje de error", async () => {
    const response = crossOriginResponse();
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Origen no permitido.",
    });
  });

  it("permite personalizar el mensaje", async () => {
    const response = crossOriginResponse("Nope");
    await expect(response.json()).resolves.toEqual({ error: "Nope" });
  });
});
