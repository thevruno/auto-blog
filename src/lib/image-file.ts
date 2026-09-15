/**
 * Validación de las imágenes que se suben desde el panel.
 *
 * El `Content-Type` que manda el navegador es un dato del cliente y se puede
 * falsificar, así que acá se decide el formato mirando los **bytes** del
 * archivo (magic numbers). Además:
 *
 * - El SVG queda fuera de la lista permitida a propósito: es un documento con
 *   scripts y, servido desde el propio dominio, permitiría XSS almacenado.
 * - Tampoco se aceptan archivos que no sean imágenes (HTML, PDF, etc.), por
 *   más que declaren un `Content-Type` de imagen.
 */

/** Tipos aceptados y la extensión con la que se guardan. */
export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

/** Tamaño máximo de una imagen subida: 5 MB. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Los formatos como texto, para los mensajes de error. */
export function allowedImageFormatsLabel(): string {
  return "JPG, PNG, WebP, GIF o AVIF";
}

function startsWith(buffer: Uint8Array, bytes: number[], offset = 0): boolean {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((byte, index) => buffer[offset + index] === byte);
}

function matchesAscii(
  buffer: Uint8Array,
  text: string,
  offset = 0,
): boolean {
  if (buffer.length < offset + text.length) return false;
  for (let i = 0; i < text.length; i += 1) {
    if (buffer[offset + i] !== text.charCodeAt(i)) return false;
  }
  return true;
}

/**
 * Detecta el tipo real de la imagen por sus primeros bytes.
 * Devuelve null si no es uno de los formatos permitidos.
 */
export function sniffImageType(buffer: Uint8Array): string | null {
  // JPEG: FF D8 FF
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return "image/jpeg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }

  // GIF87a / GIF89a
  if (matchesAscii(buffer, "GIF87a") || matchesAscii(buffer, "GIF89a")) {
    return "image/gif";
  }

  // WebP: "RIFF" + tamaño (4 bytes) + "WEBP"
  if (matchesAscii(buffer, "RIFF") && matchesAscii(buffer, "WEBP", 8)) {
    return "image/webp";
  }

  // AVIF: caja ISO-BMFF con marca "avif" o "avis"
  if (matchesAscii(buffer, "ftyp", 4)) {
    const brand = String.fromCharCode(...buffer.slice(8, 12));
    if (brand === "avif" || brand === "avis") return "image/avif";
  }

  return null;
}

/** true si el contenido parece un documento SVG (que no aceptamos). */
export function isSvgDocument(buffer: Uint8Array): boolean {
  const head = new TextDecoder("utf-8", { fatal: false })
    .decode(buffer.slice(0, 2048))
    .replace(/^\uFEFF/, "")
    .trimStart()
    .toLowerCase();

  if (head.startsWith("<svg")) return true;
  return head.startsWith("<?xml") && head.includes("<svg");
}

export type ImageValidation =
  | { ok: true; contentType: string; extension: string }
  | { ok: false; error: string };

export interface UploadCandidate {
  name: string;
  /** Valor declarado por el cliente: sólo sirve para el mensaje de error. */
  declaredType: string;
  /** Tamaño informado por el cliente (se vuelve a medir con el buffer). */
  size: number;
}

/**
 * Valida el archivo recibido y devuelve el tipo/extensión confiables.
 *
 * `buffer` es la fuente de verdad: el nombre y el `Content-Type` declarados no
 * influyen en el formato con el que se guarda el archivo.
 */
export function validateImageUpload(
  candidate: UploadCandidate,
  buffer: Uint8Array,
): ImageValidation {
  if (buffer.length === 0) {
    return { ok: false, error: "El archivo está vacío." };
  }

  if (buffer.length > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      error: `La imagen supera los ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))} MB.`,
    };
  }

  if (isSvgDocument(buffer)) {
    return {
      ok: false,
      error:
        "Los SVG no se pueden subir por seguridad. Convertí el archivo a PNG o WebP.",
    };
  }

  const contentType = sniffImageType(buffer);
  if (!contentType) {
    return {
      ok: false,
      error: `El archivo no parece una imagen válida. Usá ${allowedImageFormatsLabel()}.`,
    };
  }

  const extension = ALLOWED_IMAGE_TYPES[contentType];
  if (!extension) {
    return {
      ok: false,
      error: `Formato no permitido. Usá ${allowedImageFormatsLabel()}.`,
    };
  }

  return { ok: true, contentType, extension };
}
