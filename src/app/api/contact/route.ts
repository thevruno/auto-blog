import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { sendContactNotification } from "@/lib/mailer";
import { rateLimit, tooManyRequestsResponse } from "@/lib/rate-limit";
import { clientIp, crossOriginResponse, isSameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mensajes permitidos por IP cada 10 minutos. */
const CONTACT_LIMIT = { limit: 5, windowMs: 10 * 60_000 };

/** Topes de longitud: evitan que un bot llene la base con textos enormes. */
const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 4_000;

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return crossOriginResponse();

  const limit = rateLimit(`contact:${clientIp(req)}`, CONTACT_LIMIT);
  if (!limit.ok) {
    return tooManyRequestsResponse(
      limit.retryAfterSeconds,
      "Recibimos varios mensajes tuyos. Esperá unos minutos antes de enviar otro.",
    );
  }

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
  if (!EMAIL_RE.test(email) || email.length > MAX_EMAIL_LENGTH) {
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
  if (
    name.length > MAX_NAME_LENGTH ||
    message.length > MAX_MESSAGE_LENGTH
  ) {
    return NextResponse.json(
      {
        error: `El mensaje es demasiado largo (máximo ${MAX_MESSAGE_LENGTH} caracteres).`,
      },
      { status: 400 },
    );
  }

  await db.insert(messages).values({ name, email, message });

  // Intenta notificar por email (no bloquea si no hay SMTP configurado)
  const notified = await sendContactNotification({ name, email, message });

  return NextResponse.json({ ok: true, notified });
}
