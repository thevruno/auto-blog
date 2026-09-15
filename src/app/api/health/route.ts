import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/admin";
import { storageStatus } from "@/lib/storage";
import { isManagedPostgres } from "@/lib/db-url";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Estado del servicio.
 *
 * La respuesta pública se limita a si la base y el almacenamiento responden:
 * los mensajes de error internos (que pueden incluir host, usuario o detalles
 * de la conexión) sólo se devuelven a una sesión de administrador.
 */
export async function GET() {
  const session = await requireAdmin();
  const isAdmin = Boolean(session);

  try {
    await db.execute(sql`select 1`);
  } catch (error) {
    return Response.json(
      {
        ok: false,
        database: false,
        ...(isAdmin
          ? { error: error instanceof Error ? error.message : "sin conexión" }
          : {}),
      },
      { status: 500, headers: NO_STORE },
    );
  }

  const storage = await storageStatus();

  return Response.json(
    {
      ok: true,
      database: true,
      databaseUrl: isManagedPostgres(process.env.DATABASE_URL)
        ? "postgres administrado (TLS)"
        : "postgres",
      storage: {
        mode: storage.mode,
        bucket: storage.bucket,
        ok: storage.ok,
        ...(isAdmin ? { detail: storage.detail } : {}),
      },
    },
    { headers: NO_STORE },
  );
}
