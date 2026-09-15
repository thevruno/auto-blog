/**
 * Geometría del recortador de imágenes del panel.
 *
 * Todo el cálculo vive acá, separado del componente: son funciones puras y se
 * prueban sin navegador. El modelo es simple:
 *
 * - `frame` es el rectángulo visible (y exportado), con la proporción que usa
 *   el sitio.
 * - La imagen se muestra siempre cubriendo el frame (`coverScale`), multiplicada
 *   por el zoom que elige la persona.
 * - `offset` es cuánto se movió la imagen respecto del centro, en píxeles de
 *   pantalla.
 */

export interface Size {
  width: number;
  height: number;
}

export interface Offset {
  x: number;
  y: number;
}

export interface Rect extends Size {
  x: number;
  y: number;
}

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  const result = Math.min(Math.max(value, min), max);
  // Se normaliza el -0 para que no se cuele en los estilos ("-0px").
  return result === 0 ? 0 : result;
}

/**
 * Mantiene el zoom dentro del rango permitido y con dos decimales: sumar de a
 * 0.1 daba valores como 1.2000000000000002, que ensucian el control deslizante.
 */
export function clampZoom(zoom: number, min = MIN_ZOOM, max = MAX_ZOOM): number {
  return Math.round(clamp(zoom, min, max) * 100) / 100;
}

/**
 * Rectángulo más grande con la proporción pedida que entra en la caja dada.
 * Se usa para calcular el frame a partir del tamaño de la vista.
 */
export function frameSize(
  aspect: number,
  maxWidth: number,
  maxHeight: number,
): Size {
  const safeAspect = aspect > 0 ? aspect : 1;
  const width = Math.max(1, maxWidth);
  const height = Math.max(1, maxHeight);

  const byWidth: Size = { width, height: width / safeAspect };
  if (byWidth.height <= height) {
    return { width: Math.round(byWidth.width), height: Math.round(byWidth.height) };
  }

  return {
    width: Math.round(height * safeAspect),
    height: Math.round(height),
  };
}

/** Escala mínima para que la imagen cubra todo el frame. */
export function coverScale(frame: Size, image: Size): number {
  if (image.width <= 0 || image.height <= 0) return 1;
  return Math.max(frame.width / image.width, frame.height / image.height);
}

/** Tamaño con el que se dibuja la imagen (cover + zoom). */
export function displayedSize(frame: Size, image: Size, zoom: number): Size {
  const scale = coverScale(frame, image) * clampZoom(zoom);
  return { width: image.width * scale, height: image.height * scale };
}

/** Desplazamiento máximo permitido: hasta que la imagen deje de cubrir el frame. */
export function maxOffset(frame: Size, image: Size, zoom: number): Offset {
  const displayed = displayedSize(frame, image, zoom);
  return {
    x: Math.max(0, (displayed.width - frame.width) / 2),
    y: Math.max(0, (displayed.height - frame.height) / 2),
  };
}

/** Recorta el desplazamiento para que nunca queden bordes vacíos. */
export function clampOffset(
  offset: Offset,
  frame: Size,
  image: Size,
  zoom: number,
): Offset {
  const limit = maxOffset(frame, image, zoom);
  return {
    x: clamp(offset.x, -limit.x, limit.x),
    y: clamp(offset.y, -limit.y, limit.y),
  };
}

/**
 * Parte de la imagen (en píxeles originales) que queda dentro del frame.
 * Es lo que se le pasa a `canvas.drawImage` para generar el recorte.
 */
export function sourceRect(
  frame: Size,
  image: Size,
  zoom: number,
  offset: Offset,
): Rect {
  const scale = coverScale(frame, image) * clampZoom(zoom);
  const width = frame.width / scale;
  const height = frame.height / scale;

  const centerX = image.width / 2 - offset.x / scale;
  const centerY = image.height / 2 - offset.y / scale;

  return {
    x: clamp(centerX - width / 2, 0, Math.max(0, image.width - width)),
    y: clamp(centerY - height / 2, 0, Math.max(0, image.height - height)),
    width,
    height,
  };
}

/**
 * Tamaño final del archivo recortado: mantiene la proporción y no agranda la
 * imagen original (recortar nunca debería inventar píxeles).
 */
export function outputSize(source: Size, maxWidth: number): Size {
  const limit = Math.max(1, Math.round(maxWidth));
  if (source.width <= limit) {
    return {
      width: Math.max(1, Math.round(source.width)),
      height: Math.max(1, Math.round(source.height)),
    };
  }

  const scale = limit / source.width;
  return {
    width: limit,
    height: Math.max(1, Math.round(source.height * scale)),
  };
}

const COMMON_RATIOS: { ratio: number; label: string }[] = [
  { ratio: 1, label: "1:1" },
  { ratio: 4 / 5, label: "4:5" },
  { ratio: 5 / 4, label: "5:4" },
  { ratio: 3 / 4, label: "3:4" },
  { ratio: 4 / 3, label: "4:3" },
  { ratio: 2 / 3, label: "2:3" },
  { ratio: 3 / 2, label: "3:2" },
  { ratio: 16 / 9, label: "16:9" },
  { ratio: 9 / 16, label: "9:16" },
  { ratio: 21 / 9, label: "21:9" },
];

/** Texto corto para la proporción: `4/5` → "4:5". */
export function formatAspect(aspect: number): string {
  const found = COMMON_RATIOS.find(
    (candidate) => Math.abs(candidate.ratio - aspect) < 0.005,
  );
  if (found) return found.label;
  return aspect.toFixed(2);
}
