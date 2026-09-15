import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { compareSync } from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { rateLimit, tooManyRequestsResponse } from "@/lib/rate-limit";
import { clientIp, crossOriginResponse, isSameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

/**
 * Límites de intentos de login.
 *
 * - `LOGIN_IP_LIMIT`: frena la fuerza bruta desde una misma IP contra
 *   cualquier cuenta.
 * - `LOGIN_ACCOUNT_LIMIT`: frena los intentos repetidos contra una cuenta
 *   concreta desde la misma IP. Se combina con la IP para que nadie pueda
 *   bloquear la cuenta de otra persona desde otro lado.
 *
 * Al vivir en memoria, en serverless cada instancia lleva su propio conteo:
 * es una barrera de contención, no un límite global exacto.
 */
const LOGIN_IP_LIMIT = { limit: 20, windowMs: 10 * 60_000 };
const LOGIN_ACCOUNT_LIMIT = { limit: 8, windowMs: 10 * 60_000 };

const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 200;

/**
 * Hash bcrypt de un valor aleatorio que no se usa para nada más.
 *
 * Cuando el email no existe igual se hace una comparación contra este hash,
 * así el tiempo de respuesta no revela si la cuenta existe o no.
 */
const DUMMY_HASH =
  "$2b$10$Qr6etA1HGQVHhTy9g1dhv.eqLXmx0pntY/.YsrlHJrjye3pVQtKWa";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return crossOriginResponse();

  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!email || !password) {
    return NextResponse.json(
      { error: "Ingresá tu email y contraseña." },
      { status: 400 },
    );
  }

  if (email.length > MAX_EMAIL_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: "Email o contraseña incorrectos." },
      { status: 401 },
    );
  }

  const ip = clientIp(req);

  const ipLimit = rateLimit(`login:ip:${ip}`, LOGIN_IP_LIMIT);
  if (!ipLimit.ok) {
    return tooManyRequestsResponse(ipLimit.retryAfterSeconds);
  }

  const accountLimit = rateLimit(
    `login:account:${ip}:${email}`,
    LOGIN_ACCOUNT_LIMIT,
  );
  if (!accountLimit.ok) {
    return tooManyRequestsResponse(accountLimit.retryAfterSeconds);
  }

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const user = rows[0];

  // Las dos ramas comparan contra un hash bcrypt: el tiempo de respuesta es
  // parecido exista o no la cuenta.
  const passwordOk = compareSync(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !passwordOk) {
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
