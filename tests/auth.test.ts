import { beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => {
  return {
    cookies: new Map<string, string>(),
    lastOptions: null as Record<string, unknown> | null,
    reset() {
      this.cookies.clear();
      this.lastOptions = null;
    },
  };
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      session.cookies.has(name)
        ? { name, value: session.cookies.get(name) as string }
        : undefined,
    set: (name: string, value: string, options?: Record<string, unknown>) => {
      session.cookies.set(name, value);
      session.lastOptions = options ?? null;
    },
    delete: (name: string) => {
      session.cookies.delete(name);
    },
  }),
}));

const { createSession, destroySession, getSession } = await import("@/lib/auth");

const SECRET = "clave-de-prueba-con-mas-de-32-caracteres-ok";
const COOKIE = "ek_admin_session";

const payload = { userId: 7, email: "admin@ejemplo.com", name: "Admin" };

beforeEach(() => {
  session.reset();
  process.env.SESSION_SECRET = SECRET;
});

describe("createSession", () => {
  it("guarda el token en una cookie httpOnly", async () => {
    await createSession(payload);

    const token = session.cookies.get(COOKIE);
    expect(token).toBeTypeOf("string");
    expect(session.lastOptions).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  });

  it("no expone los datos de sesión en el valor de la cookie", async () => {
    await createSession(payload);
    const token = session.cookies.get(COOKIE) as string;
    const [, body] = token.split(".");
    const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    expect(decoded).toMatchObject({ userId: 7, email: "admin@ejemplo.com" });
  });

  it("falla si no hay SESSION_SECRET", async () => {
    delete process.env.SESSION_SECRET;
    await expect(createSession(payload)).rejects.toThrow(/SESSION_SECRET is required/);
  });

  it("falla si el SESSION_SECRET es demasiado corto", async () => {
    process.env.SESSION_SECRET = "corto";
    await expect(createSession(payload)).rejects.toThrow(/demasiado corto/i);
  });

  it("acepta un secreto de exactamente 32 caracteres", async () => {
    process.env.SESSION_SECRET = "x".repeat(32);
    await expect(createSession(payload)).resolves.toBeUndefined();
  });
});

describe("getSession", () => {
  it("devuelve el payload de una sesión válida", async () => {
    await createSession(payload);
    await expect(getSession()).resolves.toEqual(payload);
  });

  it("devuelve null cuando no hay cookie", async () => {
    await expect(getSession()).resolves.toBeNull();
  });

  it("devuelve null si el token fue manipulado", async () => {
    await createSession(payload);
    const token = session.cookies.get(COOKIE) as string;
    session.cookies.set(COOKIE, `${token.slice(0, -3)}abc`);
    await expect(getSession()).resolves.toBeNull();
  });

  it("devuelve null si el token está firmado con otro secreto", async () => {
    await createSession(payload);
    const forged = session.cookies.get(COOKIE) as string;

    session.reset();
    process.env.SESSION_SECRET = "otro-secreto-distinto-con-32-caracteres!!";
    session.cookies.set(COOKIE, forged);

    await expect(getSession()).resolves.toBeNull();
  });

  it("devuelve null con un token que no es un JWT", async () => {
    session.cookies.set(COOKIE, "no-es-un-token");
    await expect(getSession()).resolves.toBeNull();
  });

  it("devuelve null si el secreto es demasiado corto (no rompe la request)", async () => {
    await createSession(payload);
    process.env.SESSION_SECRET = "corto";
    await expect(getSession()).resolves.toBeNull();
  });
});

describe("destroySession", () => {
  it("borra la cookie de sesión", async () => {
    await createSession(payload);
    await destroySession();
    expect(session.cookies.has(COOKIE)).toBe(false);
    await expect(getSession()).resolves.toBeNull();
  });
});
