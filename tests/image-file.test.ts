import { describe, expect, it } from "vitest";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  allowedImageFormatsLabel,
  isSvgDocument,
  sniffImageType,
  validateImageUpload,
} from "@/lib/image-file";

const encoder = new TextEncoder();

const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const GIF = encoder.encode("GIF89a\u0001\u0000\u0001\u0000");
const WEBP = new Uint8Array([
  ...encoder.encode("RIFF"),
  0x1a, 0x00, 0x00, 0x00,
  ...encoder.encode("WEBP"),
  ...encoder.encode("VP8 "),
]);
const AVIF = new Uint8Array([
  0x00, 0x00, 0x00, 0x20,
  ...encoder.encode("ftypavif"),
  0x00, 0x00, 0x00, 0x00,
]);
const SVG = encoder.encode(
  `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`,
);
const SVG_WITH_XML_PROLOG = encoder.encode(
  `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg"/>`,
);
const HTML = encoder.encode("<!doctype html><html><body>hola</body></html>");

function withName(file: Uint8Array) {
  return { name: "archivo", declaredType: "application/octet-stream", size: file.length };
}

describe("sniffImageType", () => {
  it("detecta PNG, JPEG, GIF, WebP y AVIF", () => {
    expect(sniffImageType(PNG)).toBe("image/png");
    expect(sniffImageType(JPEG)).toBe("image/jpeg");
    expect(sniffImageType(GIF)).toBe("image/gif");
    expect(sniffImageType(WEBP)).toBe("image/webp");
    expect(sniffImageType(AVIF)).toBe("image/avif");
  });

  it("devuelve null con HTML, SVG o contenido vacío", () => {
    expect(sniffImageType(HTML)).toBeNull();
    expect(sniffImageType(SVG)).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });

  it("no confunde RIFF sin marca WEBP", () => {
    const wav = new Uint8Array([
      ...encoder.encode("RIFF"),
      0x1a, 0x00, 0x00, 0x00,
      ...encoder.encode("WAVE"),
    ]);
    expect(sniffImageType(wav)).toBeNull();
  });

  it("no confunde un MP4 con AVIF", () => {
    const mp4 = new Uint8Array([
      0x00, 0x00, 0x00, 0x20,
      ...encoder.encode("ftypisom"),
    ]);
    expect(sniffImageType(mp4)).toBeNull();
  });

  it("no se cae con un archivo truncado", () => {
    expect(sniffImageType(new Uint8Array([0x89]))).toBeNull();
    expect(sniffImageType(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});

describe("isSvgDocument", () => {
  it("detecta el SVG directo", () => {
    expect(isSvgDocument(SVG)).toBe(true);
  });

  it("detecta el SVG con prólogo XML y espacios previos", () => {
    expect(isSvgDocument(SVG_WITH_XML_PROLOG)).toBe(true);
    expect(isSvgDocument(encoder.encode("  \n<svg></svg>"))).toBe(true);
  });

  it("detecta el SVG en mayúsculas", () => {
    expect(isSvgDocument(encoder.encode("<SVG></SVG>"))).toBe(true);
  });

  it("no marca una imagen binaria como SVG", () => {
    expect(isSvgDocument(PNG)).toBe(false);
  });
});

describe("validateImageUpload", () => {
  it("acepta una imagen válida y devuelve tipo y extensión", () => {
    expect(validateImageUpload(withName(PNG), PNG)).toEqual({
      ok: true,
      contentType: "image/png",
      extension: ".png",
    });
  });

  it("ignora el Content-Type mentiroso y usa los bytes", () => {
    const result = validateImageUpload(
      { name: "foto.jpg", declaredType: "image/jpeg", size: PNG.length },
      PNG,
    );
    expect(result).toEqual({ ok: true, contentType: "image/png", extension: ".png" });
  });

  it("acepta un archivo sin Content-Type declarado", () => {
    const result = validateImageUpload(
      { name: "foto", declaredType: "", size: PNG.length },
      PNG,
    );
    expect(result.ok).toBe(true);
  });

  it("rechaza HTML que se hace pasar por imagen", () => {
    const result = validateImageUpload(
      { name: "foto.png", declaredType: "image/png", size: HTML.length },
      HTML,
    );
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toContain("no parece una imagen válida");
  });

  it("rechaza los SVG con un mensaje específico", () => {
    const result = validateImageUpload(
      { name: "icono.svg", declaredType: "image/svg+xml", size: SVG.length },
      SVG,
    );
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toContain("SVG");
  });

  it("rechaza los SVG con prólogo XML", () => {
    const result = validateImageUpload(withName(SVG_WITH_XML_PROLOG), SVG_WITH_XML_PROLOG);
    expect(result.ok).toBe(false);
  });

  it("rechaza archivos vacíos", () => {
    const empty = new Uint8Array();
    const result = validateImageUpload({ name: "x.png", declaredType: "image/png", size: 0 }, empty);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toContain("vacío");
  });

  it("rechaza lo que supera el máximo de 5 MB", () => {
    const big = new Uint8Array(MAX_IMAGE_BYTES + 1);
    big.set(PNG.subarray(0, 8));
    const result = validateImageUpload(withName(big), big);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toContain("5 MB");
  });

  it("acepta justo el máximo permitido", () => {
    const exact = new Uint8Array(MAX_IMAGE_BYTES);
    exact.set(PNG);
    expect(validateImageUpload(withName(exact), exact).ok).toBe(true);
  });
});

describe("lista de formatos permitidos", () => {
  it("no incluye SVG", () => {
    expect(Object.keys(ALLOWED_IMAGE_TYPES)).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
    ]);
    expect(ALLOWED_IMAGE_TYPES["image/svg+xml"]).toBeUndefined();
  });

  it("describe los formatos para los mensajes de error", () => {
    expect(allowedImageFormatsLabel()).toBe("JPG, PNG, WebP, GIF o AVIF");
  });
});
