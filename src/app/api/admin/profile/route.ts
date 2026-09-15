import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { siteProfile } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const str = (v: unknown): string => (v == null ? "" : String(v).trim());

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const rows = await db
    .select()
    .from(siteProfile)
    .orderBy(asc(siteProfile.id))
    .limit(1);
  return NextResponse.json({ profile: rows[0] ?? null });
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = str(body?.name);
  if (!name) {
    return NextResponse.json(
      { error: "El nombre es obligatorio." },
      { status: 400 },
    );
  }

  const values = {
    name,
    roleTitle: str(body?.roleTitle),
    positioning: str(body?.positioning),
    heroPhoto: str(body?.heroPhoto) || null,
    heroPhotoAlt: str(body?.heroPhotoAlt) || null,
    bio: str(body?.bio) || null,
    email: str(body?.email) || null,
    phone: str(body?.phone) || null,
    location: str(body?.location) || null,
    linkedin: str(body?.linkedin) || null,
    instagram: str(body?.instagram) || null,
    twitter: str(body?.twitter) || null,
    youtube: str(body?.youtube) || null,
    facebook: str(body?.facebook) || null,
  };

  const rows = await db
    .select({ id: siteProfile.id })
    .from(siteProfile)
    .orderBy(asc(siteProfile.id))
    .limit(1);

  let profile;
  try {
    if (rows[0]) {
      const [updated] = await db
        .update(siteProfile)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(siteProfile.id, rows[0].id))
        .returning();
      profile = updated;
    } else {
      const [inserted] = await db.insert(siteProfile).values(values).returning();
      profile = inserted;
    }
  } catch (err) {
    console.error("[profile] DB error:", err);
    return NextResponse.json(
      { error: "Error al guardar en la base de datos." },
      { status: 500 },
    );
  }

  return NextResponse.json({ profile });
}
