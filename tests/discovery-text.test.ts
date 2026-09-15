import { describe, expect, it } from "vitest";
import {
  checkRelevance,
  cleanViewCount,
  decodeEntities,
  domainOf,
  extractYouTubeId,
  fold,
  isBlockedArticleUrl,
  normalizeUrl,
  parseRelativeDate,
  queryTokens,
  splitTitleAndSource,
  stripTags,
  titleFromText,
  truncateText,
} from "@/lib/discovery/text";

describe("decodeEntities", () => {
  it("decodifica entidades con nombre", () => {
    expect(decodeEntities("a &amp; b &laquo;c&raquo;")).toBe("a & b «c»");
    expect(decodeEntities("a&ntilde;o")).toBe("año");
  });

  it("decodifica entidades numéricas y hexadecimales", () => {
    expect(decodeEntities("&#106;avascript")).toBe("javascript");
    expect(decodeEntities("&#x6a;avascript")).toBe("javascript");
  });

  it("deja las entidades desconocidas tal cual", () => {
    expect(decodeEntities("&desconocida;")).toBe("&desconocida;");
  });
});

describe("stripTags", () => {
  it("quita etiquetas y conserva el texto", () => {
    expect(stripTags("<p>Hola <strong>mundo</strong></p>")).toBe("Hola mundo");
  });

  it("convierte los saltos en espacios", () => {
    expect(stripTags("linea1<br>linea2")).toBe("linea1 linea2");
  });
});

describe("fold", () => {
  it("normaliza mayúsculas, acentos y espacios", () => {
    expect(fold("  Educación   NEURO  ")).toBe("educacion neuro");
  });
});

describe("queryTokens", () => {
  it("descarta palabras vacías y cortas", () => {
    expect(queryTokens("altas capacidades en la escuela")).toEqual([
      "altas",
      "capacidades",
      "escuela",
    ]);
  });

  it("devuelve [] con una consulta vacía", () => {
    expect(queryTokens("de la")).toEqual([]);
  });
});

describe("checkRelevance", () => {
  it("sin palabras significativas no filtra nada", () => {
    expect(checkRelevance({ title: "cualquiera" }, "de la")).toEqual({
      ok: true,
      matched: 0,
      total: 0,
    });
  });

  it("alcanza una coincidencia en modo normal", () => {
    const result = checkRelevance(
      { title: "Nuevo informe sobre altas capacidades", snippet: "" },
      "altas capacidades",
    );
    expect(result.matched).toBe(2);
    expect(result.ok).toBe(true);
  });

  it("exige todas las coincidencias en modo estricto", () => {
    const input = { title: "Informe sobre altas capacidades" };
    expect(checkRelevance(input, "altas capacidades escuela", true).ok).toBe(false);
    expect(checkRelevance(input, "altas capacidades", true).ok).toBe(true);
  });

  it("con 4+ palabras pide la mitad", () => {
    const input = { title: "altas capacidades" };
    const result = checkRelevance(input, "altas capacidades escuela inclusiva");
    expect(result.total).toBe(4);
    expect(result.matched).toBe(2);
    expect(result.ok).toBe(true);
  });

  it("rechaza cuando no hay ninguna coincidencia", () => {
    expect(checkRelevance({ title: "receta de tortas" }, "altas capacidades").ok).toBe(false);
  });

  it("busca también en autor, medio y URL", () => {
    const result = checkRelevance(
      { title: "nota", author: "IFOPAC", url: "https://ifopac.com/altas-capacidades" },
      "ifopac altas",
      true,
    );
    expect(result.ok).toBe(true);
  });
});

describe("normalizeUrl", () => {
  it("saca www, parámetros de seguimiento y barra final", () => {
    expect(
      normalizeUrl("https://www.ejemplo.com/nota/?utm_source=x&utm_medium=y"),
    ).toBe("https://ejemplo.com/nota");
  });

  it("conserva los parámetros útiles y los ordena", () => {
    expect(normalizeUrl("https://ejemplo.com/b?z=2&a=1")).toBe("https://ejemplo.com/b?a=1&z=2");
  });

  it("unifica todas las variantes de YouTube", () => {
    expect(normalizeUrl("https://youtu.be/dQw4w9WgXcQ?t=10")).toBe(
      "https://youtube.com/watch?v=dQw4w9WgXcQ",
    );
    expect(normalizeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share")).toBe(
      "https://youtube.com/watch?v=dQw4w9WgXcQ",
    );
  });

  it("pasa a minúsculas lo que no es una URL válida", () => {
    expect(normalizeUrl("No-ES-una-URL")).toBe("no-es-una-url");
  });

  it("devuelve vacío sin valor", () => {
    expect(normalizeUrl("")).toBe("");
  });
});

describe("domainOf", () => {
  it("devuelve el host sin www", () => {
    expect(domainOf("https://www.infobae.com/nota")).toBe("infobae.com");
  });

  it("devuelve vacío si la URL no es válida", () => {
    expect(domainOf("cualquier cosa")).toBe("");
  });
});

describe("extractYouTubeId", () => {
  it("reconoce watch, youtu.be, shorts, live y embed", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeId("https://www.youtube.com/live/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeId("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("acepta el id suelto", () => {
    expect(extractYouTubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("devuelve null cuando no hay video", () => {
    expect(extractYouTubeId("https://ejemplo.com/nota")).toBeNull();
    expect(extractYouTubeId("dQw4w9WgXc")).toBeNull();
  });
});

describe("isBlockedArticleUrl", () => {
  it("bloquea búsquedas de Google y redes sociales", () => {
    expect(isBlockedArticleUrl("https://www.google.com/search?q=x")).toBe(true);
    expect(isBlockedArticleUrl("https://www.facebook.com/algo")).toBe(true);
    expect(isBlockedArticleUrl("https://www.instagram.com/p/x")).toBe(true);
  });

  it("deja pasar una nota de prensa normal", () => {
    expect(isBlockedArticleUrl("https://www.infobae.com/educacion/nota")).toBe(false);
  });

  it("bloquea lo que no tiene dominio", () => {
    expect(isBlockedArticleUrl("cualquier cosa")).toBe(true);
  });
});

describe("splitTitleAndSource", () => {
  it("saca el medio del final del título", () => {
    expect(splitTitleAndSource("Una nota - Infobae")).toEqual({
      title: "Una nota",
      source: "Infobae",
    });
  });

  it("usa el medio indicado explícitamente", () => {
    expect(splitTitleAndSource("Una nota - Infobae", "Infobae")).toEqual({
      title: "Una nota",
      source: "Infobae",
    });
  });

  it("no inventa un medio cuando no se puede deducir", () => {
    expect(splitTitleAndSource("Una nota sin medio")).toEqual({
      title: "Una nota sin medio",
      source: null,
    });
  });
});

describe("titleFromText", () => {
  it("usa la primera línea y saca los links", () => {
    expect(titleFromText("Título de la nota\nhttps://ejemplo.com")).toBe("Título de la nota");
  });

  it("corta los títulos largos", () => {
    const long = "a".repeat(200);
    expect(titleFromText(long, 20)).toHaveLength(21);
  });
});

describe("parseRelativeDate", () => {
  it("convierte días y semanas relativos", () => {
    const days = parseRelativeDate("hace 3 días");
    expect(days).toBeInstanceOf(Date);
    expect(Date.now() - days!.getTime()).toBeGreaterThan(2.5 * 24 * 60 * 60 * 1000);

    const weeks = parseRelativeDate("hace 2 semanas");
    expect(Date.now() - weeks!.getTime()).toBeGreaterThan(13 * 24 * 60 * 60 * 1000);
  });

  it("acepta textos en inglés", () => {
    expect(parseRelativeDate("3 days ago")).toBeInstanceOf(Date);
  });

  it("devuelve null con meses, años o sin datos", () => {
    expect(parseRelativeDate("hace 2 meses")).toBeNull();
    expect(parseRelativeDate("hace 1 año")).toBeNull();
    expect(parseRelativeDate("")).toBeNull();
    expect(parseRelativeDate(null)).toBeNull();
  });

  it("respeta una fecha absoluta", () => {
    const date = parseRelativeDate("2026-03-15");
    expect(date?.getFullYear()).toBe(2026);
  });
});

describe("truncateText y cleanViewCount", () => {
  it("trunca con puntos suspensivos y normaliza espacios", () => {
    expect(truncateText("  hola   mundo  ", 100)).toBe("hola mundo");
    expect(truncateText("hola mundo", 4)).toBe("hola…");
  });

  it("normaliza el texto de vistas", () => {
    expect(cleanViewCount("1,2 M de vistas")).toBe("1,2 M vistas");
    expect(cleanViewCount("3500 views")).toBe("3500 vistas");
  });

  it("descarta valores vacíos o desmedidos", () => {
    expect(cleanViewCount("")).toBeNull();
    expect(cleanViewCount(null)).toBeNull();
    expect(cleanViewCount("x".repeat(80))).toBeNull();
  });
});
