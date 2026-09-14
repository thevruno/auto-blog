import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { compareSync } from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!email || !password) {
    return NextResponse.json(
      { error: "Ingresá tu email y contraseña." },
      { status: 400 },
    );
  }

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const user = rows[0];

  if (!user || !compareSync(password, user.passwordHash)) {
    return NextResponse.json(
      { error: "Email o contraseña incorrectos." },
      { status: 401 },
    );
  }

  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
  });

  return NextResponse.json({ ok: true, user: { name: user.name, email: user.email } });
}
