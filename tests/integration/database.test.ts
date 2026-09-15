/**
 * Pruebas de integración contra una base Postgres real.
 *
 * Se saltean solas cuando no hay `DATABASE_URL` (que es el caso del CI y de
 * cualquier clon sin base configurada). Para correrlas:
 *
 *   DATABASE_URL=postgresql://… npm test
 */
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { ensureSchema } from "@/db/bootstrap";

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("integración con Postgres", () => {
  it("responde a una consulta simple", async () => {
    const rows = (await db.execute(sql`select 1 as ok`)) as unknown as {
      rows: { ok: number }[];
    };
    expect(rows.rows[0]?.ok).toBe(1);
  });

  it("prepara el esquema de forma idempotente", async () => {
    await ensureSchema();
    await expect(ensureSchema()).resolves.toBeUndefined();

    const { rows } = (await db.execute(
      sql`select to_regclass('discovery_topics') as tabla`,
    )) as unknown as { rows: { tabla: string | null }[] };
    expect(rows[0]?.tabla).toBe("discovery_topics");
  });
});
