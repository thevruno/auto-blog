import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("pasa a minúsculas y separa con guiones", () => {
    expect(slugify("Altas Capacidades en la Escuela")).toBe(
      "altas-capacidades-en-la-escuela",
    );
  });

  it("quita acentos y la eñe", () => {
    expect(slugify("Educación y neurociencia")).toBe("educacion-y-neurociencia");
    expect(slugify("Año 2026")).toBe("ano-2026");
  });

  it("saca signos de puntuación y emojis", () => {
    expect(slugify("¿Qué es el TDAH? 🤔")).toBe("que-es-el-tdah");
  });

  it("colapsa guiones repetidos y espacios múltiples", () => {
    expect(slugify("hola   ---  mundo")).toBe("hola-mundo");
  });

  it("no deja guiones en los extremos", () => {
    expect(slugify("---hola---")).toBe("hola");
    expect(slugify("  hola  ")).toBe("hola");
  });

  it("convierte guiones bajos en guiones", () => {
    expect(slugify("mi_nota_especial")).toBe("mi-nota-especial");
  });

  it("devuelve string vacío cuando no queda nada usable", () => {
    expect(slugify("¡¡¡!!!")).toBe("");
    expect(slugify("")).toBe("");
  });

  it("mantiene números", () => {
    expect(slugify("Informe 2025-2026")).toBe("informe-2025-2026");
  });
});
