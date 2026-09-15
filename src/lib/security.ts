import { createHash, timingSafeEqual } from "crypto";

/**
 * Utilidades de seguridad compartidas por los endpoints.
 *
 * Se mantienen libres de dependencias de Next.js (sólo Web APIs) para que sean
 * fáciles de probar de forma aislada.
 */

/**
 * Compara dos strings en tiempo constante.
 *
 * Se comparan los hashes y no los valores originales para que la duración no
 * dependa del largo de los strings: así no se filtra información por timing
 * (por ejemplo, cuántos caracteres de la clave de cron son correctos).
 */
export function safeEqualString(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a, "utf8").digest();
  const hashB = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(hashA, hashB);
}

/**
 * IP del cliente, mirando primero las cabeceras que agrega el proxy/hosting
 * (Vercel) y cayendo a un valor fijo si no hay ninguna.
 *
 * Sólo se usa para limitar la cantidad de intentos, nunca para autorizar.
 */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || req.headers.get("x-real-ip")?.trim() || "desconocida";
}

/**
 * Verifica que la request venga del propio sitio.
 *
 * Los navegadores siempre envían `Origin` en los pedidos cross-site, así que
 * rechazar un `Origin` que no coincide con el host corta los ataques de tipo
 * CSRF (por ejemplo, un formulario de otro dominio que dispara el login).
 * Si no hay `Origin` (curl, cron, clientes server-side) se deja pasar: esos
 * clientes no pueden ser víctimas de CSRF.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;

  const host = req.headers.get("host");
  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Respuesta 403 estándar para pedidos cross-site. */
export function crossOriginResponse(
  message = "Origen no permitido.",
): Response {
  return Response.json({ error: message }, { status: 403 });
}
