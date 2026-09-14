import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { sendContactNotification } from "@/lib/mailer";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const message = String(body?.message ?? "").trim();

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Completá nombre, email y mensaje." },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "El email ingresado no es válido." },
      { status: 400 },
    );
  }
  if (message.length < 10) {
    return NextResponse.json(
      { error: "El mensaje es demasiado corto." },
      { status: 400 },
    );
  }

  await db.insert(messages).values({ name, email, message });

  // Intenta notificar por email (no bloquea si no hay SMTP configurado)
  const notified = await sendContactNotification({ name, email, message });

  return NextResponse.json({ ok: true, notified });
}
