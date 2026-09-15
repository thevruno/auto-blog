import { afterEach, describe, expect, it } from "vitest";
import {
  absoluteUrl,
  formatDate,
  formatDateShort,
  formatDateTime,
  readingTimeMinutes,
  sanitizeHtml,
  stripHtml,
  truncate,
} from "@/lib/utils";

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
});

describe("stripHtml", () => {
  it("quita etiquetas y normaliza espacios", () => {
    expect(stripHtml("<p>Hola   <strong>mundo</strong></p>")).toBe("Hola mundo");
  });

  it("decodifica las entidades más comunes", () => {
    expect(stripHtml("<p>a &amp; b &lt;c&gt; &quot;d&quot; &#39;e&#39;&nbsp;f</p>")).toBe(
      `a & b <c> "d" 'e' f`,
    );
  });

  it("devuelve string vacío si no hay texto", () => {
    expect(stripHtml("<p></p>")).toBe("");
  });
});

describe("readingTimeMinutes", () => {
  it("siempre devuelve al menos un minuto", () => {
    expect(readingTimeMinutes("")).toBe(1);
    expect(readingTimeMinutes("<p>dos palabras</p>")).toBe(1);
  });

  it("redondea según 200 palabras por minuto", () => {
    const words = Array.from({ length: 600 }, () => "palabra").join(" ");
    expect(readingTimeMinutes(`<p>${words}</p>`)).toBe(3);
  });
});

describe("truncate", () => {
  it("no toca los textos cortos", () => {
    expect(truncate("hola", 10)).toBe("hola");
  });

  it("corta y agrega puntos suspensivos", () => {
    expect(truncate("hola mundo grande", 10)).toBe("hola mundo…");
  });

  it("colapsa los espacios y recorta los extremos", () => {
    expect(truncate("  hola    mundo  ", 100)).toBe("hola mundo");
  });
});

describe("formatDate / formatDateShort / formatDateTime", () => {
  it("devuelve string vacío con valores vacíos o inválidos", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("no-es-fecha")).toBe("");
    expect(formatDateShort("")).toBe("");
    expect(formatDateTime(null)).toBe("");
    expect(formatDateTime("no-es-fecha")).toBe("");
  });

  it("formatea fechas en español", () => {
    const date = new Date("2026-03-15T12:00:00Z");
    expect(formatDate(date)).toContain("2026");
    expect(formatDate(date)).toContain("marzo");
    expect(formatDateShort(date)).toContain("2026");
    expect(formatDateTime(date)).toContain("2026");
  });

  it("acepta strings ISO y timestamps", () => {
    expect(formatDate("2026-03-15T12:00:00Z")).toBe(formatDate(new Date("2026-03-15T12:00:00Z")));
    expect(formatDate(1773576000000)).not.toBe("");
  });
});

describe("absoluteUrl", () => {
  it("usa NEXT_PUBLIC_SITE_URL como base", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://elenakuchimpos.com";
    expect(absoluteUrl("/blog")).toBe("https://elenakuchimpos.com/blog");
  });

  it("saca la barra final de la base y agrega la inicial de la ruta", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://elenakuchimpos.com///";
    expect(absoluteUrl("blog")).toBe("https://elenakuchimpos.com/blog");
  });

  it("cae a localhost cuando no hay variable", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(absoluteUrl("/blog")).toBe("http://localhost:3000/blog");
  });

  it("funciona sin argumentos", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://elenakuchimpos.com";
    expect(absoluteUrl()).toBe("https://elenakuchimpos.com/");
  });
});

describe("sanitizeHtml (básicos)", () => {
  it("devuelve vacío sin contenido", () => {
    expect(sanitizeHtml("")).toBe("");
  });

  it("mantiene el texto plano sin cambios", () => {
    expect(sanitizeHtml("Un texto simple")).toBe("Un texto simple");
  });
});
