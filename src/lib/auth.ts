import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";

/**
 * Largo mínimo exigido al secreto de sesión.
 *
 * Los tokens se firman con HS256: con un secreto corto (o adivinable) se puede
 * firmar un token propio y entrar al panel, así que se exige el equivalente a
 * 32 bytes de entropía, que es lo que genera `openssl rand -hex 32`.
 */
const MIN_SECRET_LENGTH = 32;

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is required. Generate one with: openssl rand -hex 32",
    );
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `SESSION_SECRET es demasiado corto (${secret.length} caracteres). Usá al menos ${MIN_SECRET_LENGTH}: openssl rand -hex 32`,
    );
  }
  return new TextEncoder().encode(secret);
}
const COOKIE_NAME = "ek_admin_session";

export interface SessionPayload {
  userId: number;
  email: string;
  name: string;
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId: Number(payload.userId),
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
    };
  } catch {
    return null;
  }
}
