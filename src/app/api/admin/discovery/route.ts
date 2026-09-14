import { NextRequest, NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/bootstrap";
import { discoveryLeads } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { listLeads } from "@/lib/discovery/list";
import { PROVIDERS } from "@/lib/discovery/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const result = await listLeads({
    q: url.searchParams.get("q") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
    provider: url.searchParams.get("provider") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    topicId: url.searchParams.get("topicId")
      ? Number(url.searchParams.get("topicId"))
      : null,
    limit: url.searchParams.get("limit")
      ? Number(url.searchParams.get("limit"))
      : undefined,
    offset: url.searchParams.get("offset")
      ? Number(url.searchParams.get("offset"))
      : undefined,
  });

  return NextResponse.json({ ...result, providers: PROVIDERS });
}

/** Limpia los hallazgos descartados (?status=discarded) o todos (?status=all). */
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const scope = new URL(req.url).searchParams.get("status") ?? "discarded";
  if (scope !== "discarded" && scope !== "all") {
    return NextResponse.json(
      { error: "Solo se pueden borrar los descartados." },
      { status: 400 },
    );
  }

  await ensureSchema();
  const deleted = await db
    .delete(discoveryLeads)
    .where(
      scope === "discarded"
        ? inArray(discoveryLeads.status, ["discarded"])
        : undefined,
    )
    .returning({ id: discoveryLeads.id });

  return NextResponse.json({ ok: true, deleted: deleted.length });
}
