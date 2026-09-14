/**
 * Carga de variables de entorno para todo lo que corre FUERA de Next.js
 * (drizzle-kit, seed, scripts sueltos). Next ya carga los .env* por su cuenta.
 *
 * Orden de prioridad: .env.local (Supabase / producción) →
 * .env.development.local (base local de desarrollo) → .env
 * El primer valor definido gana.
 */
import { config } from "dotenv";

config({
  path: [".env.local", ".env.development.local", ".env"],
  quiet: true,
});
