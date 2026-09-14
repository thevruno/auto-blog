import { sql } from "drizzle-orm";
import { db } from "@/db";
import { storageStatus } from "@/lib/storage";
import { isManagedPostgres } from "@/lib/db-url";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
  } catch (error) {
    return Response.json(
      {
        ok: false,
        database: false,
        error: error instanceof Error ? error.message : "sin conexión",
      },
      { status: 500 },
    );
  }

  const storage = await storageStatus();

  return Response.json({
    ok: true,
    database: true,
    databaseUrl: isManagedPostgres(process.env.DATABASE_URL)
      ? "postgres administrado (TLS)"
      : "postgres",
    storage: {
      mode: storage.mode,
      bucket: storage.bucket,
      ok: storage.ok,
      detail: storage.detail,
    },
  });
}
