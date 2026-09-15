import { describe, expect, it } from "vitest";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  clamp,
  clampOffset,
  clampZoom,
  coverScale,
  displayedSize,
  formatAspect,
  frameSize,
  maxOffset,
  outputSize,
  sourceRect,
} from "@/lib/crop";

const FRAME = { width: 400, height: 500 };
const CUADRADA = { width: 1000, height: 1000 };

describe("clamp y clampZoom", () => {
  it("limita dentro del rango", () => {
    expect(clamp(5, 1, 3)).toBe(3);
    expect(clamp(-2, 1, 3)).toBe(1);
    expect(clamp(2, 1, 3)).toBe(2);
  });

  it("cae al mínimo con NaN", () => {
    expect(clamp(Number.NaN, 1, 3)).toBe(1);
  });

  it("el zoom nunca baja de 1 (la imagen tiene que cubrir el marco)", () => {
    expect(clampZoom(0.2)).toBe(MIN_ZOOM);
    expect(clampZoom(99)).toBe(MAX_ZOOM);
    expect(clampZoom(2)).toBe(2);
  });

  it("redondea el zoom a dos decimales", () => {
    expect(clampZoom(1.2000000000000002)).toBe(1.2);
    expect(clampZoom(1.6666)).toBe(1.67);
  });
});

describe("frameSize", () => {
  it("se limita por el ancho cuando la caja es ancha", () => {
    expect(frameSize(1, 400, 500)).toEqual({ width: 400, height: 400 });
  });

  it("se limita por el alto cuando la caja es baja", () => {
    expect(frameSize(1, 400, 300)).toEqual({ width: 300, height: 300 });
  });

  it("respeta la proporción 4:5", () => {
    const frame = frameSize(4 / 5, 600, 300);
    expect(frame.height).toBe(300);
    expect(frame.width).toBe(240);
  });

  it("da el mismo resultado con la proporción exacta de la caja", () => {
    expect(frameSize(0.8, 400, 500)).toEqual({ width: 400, height: 500 });
  });

  it("nunca devuelve medidas menores a 1", () => {
    const frame = frameSize(1, 0, 0);
    expect(frame.width).toBeGreaterThanOrEqual(1);
    expect(frame.height).toBeGreaterThanOrEqual(1);
  });

  it("con una proporción inválida usa 1:1", () => {
    expect(frameSize(0, 100, 100)).toEqual({ width: 100, height: 100 });
  });
});

describe("coverScale y displayedSize", () => {
  it("escala la imagen hasta cubrir el marco", () => {
    expect(coverScale(FRAME, CUADRADA)).toBeCloseTo(0.5);
    // Manda el eje que más agranda la imagen (1000/3000), no el otro.
    expect(
      coverScale({ width: 800, height: 1000 }, { width: 4000, height: 3000 }),
    ).toBeCloseTo(1000 / 3000);
  });

  it("devuelve 1 si la imagen no tiene medidas", () => {
    expect(coverScale(FRAME, { width: 0, height: 0 })).toBe(1);
  });

  it("con zoom 1 la imagen cubre el marco en las dos direcciones", () => {
    const displayed = displayedSize(FRAME, CUADRADA, 1);
    expect(displayed.width).toBeGreaterThanOrEqual(FRAME.width);
    expect(displayed.height).toBeGreaterThanOrEqual(FRAME.height);
    expect(displayed.height).toBeCloseTo(500);
    expect(displayed.width).toBeCloseTo(500);
  });

  it("el zoom multiplica el tamaño mostrado", () => {
    const uno = displayedSize(FRAME, CUADRADA, 1);
    const dos = displayedSize(FRAME, CUADRADA, 2);
    expect(dos.width).toBeCloseTo(uno.width * 2);
    expect(dos.height).toBeCloseTo(uno.height * 2);
  });
});

describe("maxOffset y clampOffset", () => {
  it("no deja mover si la imagen entra justa", () => {
    const image = { width: 800, height: 1000 };
    expect(maxOffset(FRAME, image, 1)).toEqual({ x: 0, y: 0 });
  });

  it("permite mover en el eje que sobra", () => {
    const image = { width: 2000, height: 1000 };
    const limit = maxOffset(FRAME, image, 1);
    // cover = 0.5 → la imagen se muestra 1000 × 500, así que sobran 600 px de ancho.
    expect(limit.x).toBeCloseTo(300);
    expect(limit.y).toBe(0);
  });

  it("recorta los desplazamientos que dejarían bordes vacíos", () => {
    const image = { width: 2000, height: 1000 };
    const limit = maxOffset(FRAME, image, 1);

    const derecha = clampOffset({ x: 9999, y: 9999 }, FRAME, image, 1);
    expect(derecha.x).toBeCloseTo(limit.x);
    expect(derecha.y).toBe(0);

    const izquierda = clampOffset({ x: -9999, y: -9999 }, FRAME, image, 1);
    expect(izquierda.x).toBeCloseTo(-limit.x);
    expect(izquierda.y).toBe(0);
  });

  it("al bajar el zoom vuelve a encajar la imagen", () => {
    const image = { width: 1000, height: 1000 };
    // Con zoom 2 la imagen se muestra 1000 × 1000: sobran 600 px de ancho.
    const conZoom = clampOffset({ x: 9999, y: 0 }, FRAME, image, 2);
    expect(conZoom.x).toBeCloseTo(300);

    // Al volver a zoom 1 sólo sobran 100 px, así que el desplazamiento se reduce.
    const sinZoom = clampOffset(conZoom, FRAME, image, 1);
    expect(sinZoom.x).toBeCloseTo(50);
  });
});

describe("sourceRect", () => {
  it("centrado con zoom 1 toma la mayor parte posible de la imagen", () => {
    const rect = sourceRect(FRAME, CUADRADA, 1, { x: 0, y: 0 });
    expect(rect.width).toBeCloseTo(800);
    expect(rect.height).toBeCloseTo(1000);
    expect(rect.x).toBeCloseTo(100);
    expect(rect.y).toBeCloseTo(0);
  });

  it("con zoom 2 recorta a la mitad", () => {
    const rect = sourceRect(FRAME, CUADRADA, 2, { x: 0, y: 0 });
    expect(rect.width).toBeCloseTo(400);
    expect(rect.height).toBeCloseTo(500);
    expect(rect.x).toBeCloseTo(300);
    expect(rect.y).toBeCloseTo(250);
  });

  it("mover la imagen hacia la derecha corre el recorte hacia la izquierda", () => {
    const rect = sourceRect(FRAME, CUADRADA, 1, { x: 50, y: 0 });
    expect(rect.x).toBeCloseTo(0);
  });

  it("nunca se sale de la imagen", () => {
    const rect = sourceRect(FRAME, CUADRADA, 1, { x: -9999, y: -9999 });
    expect(rect.x + rect.width).toBeLessThanOrEqual(CUADRADA.width + 0.001);
    expect(rect.y + rect.height).toBeLessThanOrEqual(CUADRADA.height + 0.001);
    expect(rect.x).toBeGreaterThanOrEqual(0);
    expect(rect.y).toBeGreaterThanOrEqual(0);
  });

  it("mantiene la proporción del marco", () => {
    const rect = sourceRect(FRAME, { width: 1600, height: 1200 }, 1.5, { x: 10, y: -20 });
    expect(rect.width / rect.height).toBeCloseTo(FRAME.width / FRAME.height, 5);
  });

  it("funciona con fotos verticales y horizontales", () => {
    // Foto vertical (1000 × 2000) en un marco 4:5: se recorta a lo alto.
    const vertical = sourceRect(FRAME, { width: 1000, height: 2000 }, 1, { x: 0, y: 0 });
    expect(vertical.width).toBeCloseTo(1000);
    expect(vertical.height).toBeCloseTo(1250);
    expect(vertical.y).toBeCloseTo(375);

    const horizontal = sourceRect(FRAME, { width: 3000, height: 1000 }, 1, { x: 0, y: 0 });
    expect(horizontal.width / horizontal.height).toBeCloseTo(0.8, 5);
    expect(horizontal.y).toBeCloseTo(0);
  });
});

describe("outputSize", () => {
  it("achica a lo ancho cuando la imagen es más grande que el límite", () => {
    expect(outputSize({ width: 1600, height: 2000 }, 800)).toEqual({
      width: 800,
      height: 1000,
    });
  });

  it("no agranda la imagen original", () => {
    expect(outputSize({ width: 300, height: 375 }, 800)).toEqual({
      width: 300,
      height: 375,
    });
  });

  it("mantiene la proporción", () => {
    const size = outputSize({ width: 2000, height: 1000 }, 500);
    expect(size.width / size.height).toBeCloseTo(2, 2);
  });

  it("siempre devuelve enteros positivos", () => {
    const size = outputSize({ width: 10.6, height: 13.2 }, 400);
    expect(Number.isInteger(size.width)).toBe(true);
    expect(Number.isInteger(size.height)).toBe(true);
    expect(size.width).toBeGreaterThan(0);
  });
});

describe("formatAspect", () => {
  it("nombra las proporciones habituales", () => {
    expect(formatAspect(4 / 5)).toBe("4:5");
    expect(formatAspect(1)).toBe("1:1");
    expect(formatAspect(16 / 9)).toBe("16:9");
    expect(formatAspect(3 / 2)).toBe("3:2");
  });

  it("usa un número con dos decimales para el resto", () => {
    expect(formatAspect(2.5)).toBe("2.50");
  });
});
