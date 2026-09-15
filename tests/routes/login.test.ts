import { hashSync } from "bcryptjs";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimit } from "@/lib/rate-limit";

/** Fila que devuelve la "base de datos" en cada test. */
const state = vi.hoisted(() => ({ rows: [] as unknown[] }));

const cookies = vi.hoisted(() => ({
  store: new Map<string, string>(),
  reset() {
    this.store.clear();
  },
}));

vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => state.rows }),
      }),
    }),
  },
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      cookies.store.has(name)
        ? { name, value: cookies.store.get(name) as string }
        : undefined,
    set: (name: string, value: string) => cookies.store.set(name, value),
    delete: (name: string) => cookies.store.delete(name),
  }),
}));

const { POST } = await import("@/app/api/auth/login/route");

const PASSWORD = "Supersecreto2020";
const USER = {
  id: 1,
  email: "admin@ejemplo.com",
  name: "Admin",
  passwordHash: hashSync(PASSWORD, 4),
};

function loginRequest(
  body: unknown,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "localhost:3000",
      origin: "http://localhost:3000",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function json(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

beforeEach(() => {
  state.rows = [];
  cookies.reset();
  resetRateLimit();
  process.env.SESSION_SECRET = "clave-de-prueba-con-mas-de-32-caracteres-ok";
});

describe("POST /api/auth/login", () => {
  it("rechaza pedidos de otro origen", async () => {
    const response = await POST(
      loginRequest({ email: USER.email, password: PASSWORD }, { origin: "https://malicioso.com" }),
    );
    expect(response.status).toBe(403);
  });

  it("pide email y contraseña", async () => {
    const response = await POST(loginRequest({ email: "", password: "" }));
    expect(response.status).toBe(400);
    expect(await json(response)).toMatchObject({ error: expect.stringContaining("email") });
  });

  it("responde 400 si el cuerpo no es JSON", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { host: "localhost:3000", origin: "http://localhost:3000" },
      body: "no es json",
    });
    expect((await POST(request)).status).toBe(400);
  });

  it("devuelve 401 con credenciales inexistentes", async () => {
    state.rows = [];
    const response = await POST(
      loginRequest({ email: "nadie@ejemplo.com", password: PASSWORD }),
    );
    expect(response.status).toBe(401);
    expect(await json(response)).toEqual({ error: "Email o contraseña incorrectos." });
    expect(cookies.store.size).toBe(0);
  });

  it("devuelve 401 con contraseña incorrecta y no crea sesión", async () => {
    state.rows = [USER];
    const response = await POST(
      loginRequest({ email: USER.email, password: "otra-clave" }),
    );
    expect(response.status).toBe(401);
    expect(cookies.store.size).toBe(0);
  });

  it("usa el mismo mensaje para usuario inexistente y clave incorrecta", async () => {
    state.rows = [];
    const sinUsuario = await json(
      await POST(loginRequest({ email: "nadie@ejemplo.com", password: "x" })),
    );

    state.rows = [USER];
    const claveMal = await json(
      await POST(loginRequest({ email: USER.email, password: "x" })),
    );

    expect(sinUsuario).toEqual(claveMal);
  });

  it("normaliza el email (mayúsculas y espacios)", async () => {
    state.rows = [USER];
    const response = await POST(
      loginRequest({ email: "  ADMIN@Ejemplo.com ", password: PASSWORD }),
    );
    expect(response.status).toBe(200);
  });

  it("crea la sesión y devuelve los datos públicos del usuario", async () => {
    state.rows = [USER];
    const response = await POST(
      loginRequest({ email: USER.email, password: PASSWORD }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      user: { name: "Admin", email: "admin@ejemplo.com" },
    });
    expect(cookies.store.has("ek_admin_session")).toBe(true);
  });

  it("rechaza un email o una contraseña desmedidos sin tocar la base", async () => {
    const longEmail = await POST(
      loginRequest({ email: `${"a".repeat(250)}@ejemplo.com`, password: PASSWORD }),
    );
    expect(longEmail.status).toBe(401);

    const longPassword = await POST(
      loginRequest({ email: USER.email, password: "x".repeat(500) }),
    );
    expect(longPassword.status).toBe(401);
  });

  it("bloquea con 429 después de varios intentos contra la misma cuenta", async () => {
    state.rows = [USER];

    for (let i = 0; i < 8; i += 1) {
      const response = await POST(
        loginRequest({ email: USER.email, password: "clave-mala" }),
      );
      expect(response.status).toBe(401);
    }

    const blocked = await POST(
      loginRequest({ email: USER.email, password: "clave-mala" }),
    );
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
  });

  it("bloquea con 429 a una IP que prueba muchas cuentas distintas", async () => {
    state.rows = [];

    for (let i = 0; i < 20; i += 1) {
      const response = await POST(
        loginRequest({ email: `cuenta${i}@ejemplo.com`, password: "clave-mala" }),
      );
      expect(response.status).toBe(401);
    }

    const blocked = await POST(
      loginRequest({ email: "otra-mas@ejemplo.com", password: "clave-mala" }),
    );
    expect(blocked.status).toBe(429);
  });

  it("no bloquea a otra IP cuando una se pasa de intentos", async () => {
    state.rows = [USER];
    for (let i = 0; i < 8; i += 1) {
      await POST(loginRequest({ email: USER.email, password: "clave-mala" }));
    }

    const otraIp = await POST(
      loginRequest(
        { email: USER.email, password: PASSWORD },
        { "x-forwarded-for": "203.0.113.99" },
      ),
    );
    expect(otraIp.status).toBe(200);
  });
});
