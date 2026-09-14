/**
 * Normalización de la cadena de conexión.
 *
 * Supabase (y la mayoría de los Postgres administrados) exigen TLS, pero la
 * cadena que copiás del panel no siempre trae `sslmode`. Acá se agrega solo
 * cuando el host es de Supabase y la URL no lo especifica, para no romper
 * conexiones locales.
 */
const MANAGED_HOSTS = [
  /(^|\.)supabase\.co$/,
  /(^|\.)supabase\.com$/,
  /(^|\.)pooler\.supabase\.com$/,
  /(^|\.)neon\.tech$/,
];

export function normalizeDatabaseUrl(raw: string | undefined): string | undefined {
  const value = (raw ?? "").trim();
  if (!value) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return value;
  }

  const host = parsed.hostname.toLowerCase();
  const managed = MANAGED_HOSTS.some((pattern) => pattern.test(host));
  const hasSslMode = Array.from(parsed.searchParams.keys()).some(
    (key) => key.toLowerCase() === "sslmode",
  );

  if (managed && !hasSslMode) {
    parsed.searchParams.set("sslmode", "require");
  }

  if (managed && !parsed.searchParams.has("uselibpqcompat")) {
    parsed.searchParams.set("uselibpqcompat", "true");
  }

  return parsed.toString();
}

/** true si la URL apunta a un Postgres administrado (Supabase, Neon, …). */
export function isManagedPostgres(raw: string | undefined): boolean {
  const value = (raw ?? "").trim();
  if (!value) return false;
  try {
    const host = new URL(value).hostname.toLowerCase();
    return MANAGED_HOSTS.some((pattern) => pattern.test(host));
  } catch {
    return false;
  }
}
