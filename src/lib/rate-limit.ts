/**
 * Limitador de intentos en memoria (ventana fija).
 *
 * Alcanza para frenar fuerza bruta contra el login, spam del formulario de
 * contacto y abuso de los endpoints que suben archivos. En un despliegue
 * serverless cada instancia tiene su propia memoria, así que es una barrera
 * "best effort": para un límite global haría falta un store compartido
 * (Redis, Upstash, etc.).
 *
 * Sin dependencias de Next.js para poder probarlo de forma aislada.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  /** Cantidad de pedidos permitidos dentro de la ventana. */
  limit: number;
  /** Largo de la ventana, en milisegundos. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  /** Pedidos que quedan antes de bloquear. */
  remaining: number;
  /** Segundos que conviene esperar cuando `ok` es false. */
  retryAfterSeconds: number;
}

const buckets = new Map<string, Bucket>();

/** Tope de claves guardadas: evita que el Map crezca sin límite. */
const MAX_KEYS = 5_000;

function prune(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Registra un intento para `key` y devuelve si está permitido.
 *
 * La primera llamada dentro de una ventana abre el contador; una vez superado
 * el límite se rechaza hasta que la ventana expire.
 */
export function rateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();

  if (buckets.size >= MAX_KEYS) prune(now);

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: Math.max(0, limit - 1), retryAfterSeconds: 0 };
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((bucket.resetAt - now) / 1000),
      ),
    };
  }

  return {
    ok: true,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds: 0,
  };
}

/** Borra los contadores (global o de una clave). Pensado para los tests. */
export function resetRateLimit(key?: string): void {
  if (key === undefined) buckets.clear();
  else buckets.delete(key);
}

/** Respuesta 429 estándar, con `Retry-After`. */
export function tooManyRequestsResponse(
  retryAfterSeconds: number,
  message = "Demasiados intentos. Esperá unos minutos y probá de nuevo.",
): Response {
  return Response.json(
    { error: message },
    {
      status: 429,
      headers: { "Retry-After": String(Math.max(1, retryAfterSeconds)) },
    },
  );
}
