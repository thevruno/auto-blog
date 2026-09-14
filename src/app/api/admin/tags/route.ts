import { NextResponse } from "next/server";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const rows = await db.select({ tags: posts.tags }).from(posts);
  const set = new Set<string>();
  for (const row of rows) {
    for (const tag of row.tags ?? []) set.add(tag);
  }
  return NextResponse.json({ tags: Array.from(set).sort((a, b) => a.localeCompare(b)) });
}
