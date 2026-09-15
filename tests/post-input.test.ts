import { describe, expect, it } from "vitest";
import {
  computePublishedAt,
  deriveExcerpt,
  normalizeTags,
} from "@/lib/post-input";

describe("normalizeTags", () => {
  it("limpia, recorta y deduplica un array", () => {
    expect(normalizeTags(["  neuro  ", "neuro", "educación "])).toEqual([
      "neuro",
      "educación",
    ]);
  });

  it("acepta un string separado por comas", () => {
    expect(normalizeTags("a, b ,c")).toEqual(["a", "b", "c"]);
  });

  it("corta los tags muy largos a 60 caracteres", () => {
    const tag = "x".repeat(80);
    expect(normalizeTags([tag])[0]).toHaveLength(60);
  });

  it("devuelve [] con valores que no sirven", () => {
    expect(normalizeTags(undefined)).toEqual([]);
    expect(normalizeTags(null)).toEqual([]);
    expect(normalizeTags(42)).toEqual([]);
    expect(normalizeTags(["", "   "])).toEqual([]);
  });
});

describe("deriveExcerpt", () => {
  it("usa el texto propio cuando existe", () => {
    expect(deriveExcerpt("<p>contenido</p>", "  mi resumen  ")).toBe("mi resumen");
  });

  it("deriva del contenido cuando no hay resumen", () => {
    expect(deriveExcerpt("<p>Hola <strong>mundo</strong></p>", "")).toBe("Hola mundo");
  });

  it("corta a 160 caracteres", () => {
    const long = `<p>${"palabra ".repeat(40)}</p>`;
    expect(deriveExcerpt(long, "").length).toBeLessThanOrEqual(161);
  });
});

describe("computePublishedAt", () => {
  it("devuelve null si no está publicado", () => {
    expect(computePublishedAt("draft", "2026-03-15T12:00:00Z")).toBeNull();
  });

  it("respeta la fecha indicada", () => {
    const date = computePublishedAt("published", "2026-03-15T12:00:00Z");
    expect(date?.toISOString()).toBe("2026-03-15T12:00:00.000Z");
  });

  it("usa la fecha actual cuando no hay una válida", () => {
    const before = Date.now();
    const date = computePublishedAt("published", "");
    expect(date).toBeInstanceOf(Date);
    expect(date!.getTime()).toBeGreaterThanOrEqual(before);

    expect(computePublishedAt("published", "no-es-fecha")).toBeInstanceOf(Date);
    expect(computePublishedAt("published", 123)).toBeInstanceOf(Date);
  });
});
