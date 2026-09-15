import { describe, expect, it } from "vitest";
import { isManagedPostgres, normalizeDatabaseUrl } from "@/lib/db-url";

describe("normalizeDatabaseUrl", () => {
  it("devuelve undefined sin valor", () => {
    expect(normalizeDatabaseUrl(undefined)).toBeUndefined();
    expect(normalizeDatabaseUrl("")).toBeUndefined();
    expect(normalizeDatabaseUrl("   ")).toBeUndefined();
  });

  it("agrega sslmode=require a Supabase", () => {
    const url = normalizeDatabaseUrl(
      "postgresql://postgres.abc:clave@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
    );
    expect(url).toContain("sslmode=require");
    expect(url).toContain("uselibpqcompat=true");
  });

  it("agrega TLS también a Neon", () => {
    const url = normalizeDatabaseUrl("postgresql://user:pass@ep-x.neon.tech/db");
    expect(url).toContain("sslmode=require");
  });

  it("respeta el sslmode ya definido", () => {
    const url = normalizeDatabaseUrl(
      "postgresql://postgres.abc:clave@db.abc.supabase.co:5432/postgres?sslmode=verify-full",
    );
    expect(url).toContain("sslmode=verify-full");
    expect(url).not.toContain("sslmode=require");
  });

  it("no toca una base local", () => {
    const url = normalizeDatabaseUrl("postgresql://postgres:postgres@localhost:5432/blog");
    expect(url).not.toContain("sslmode");
    expect(url).not.toContain("uselibpqcompat");
  });

  it("devuelve el valor tal cual si no es una URL válida", () => {
    expect(normalizeDatabaseUrl("no-es-una-url")).toBe("no-es-una-url");
  });

  it("recorta los espacios alrededor", () => {
    const url = normalizeDatabaseUrl("  postgresql://postgres:postgres@localhost:5432/blog  ");
    expect(url?.startsWith("postgresql://postgres:postgres@localhost")).toBe(true);
  });
});

describe("isManagedPostgres", () => {
  it("reconoce Supabase y Neon", () => {
    expect(isManagedPostgres("postgresql://x@db.abc.supabase.co:5432/postgres")).toBe(true);
    expect(
      isManagedPostgres("postgresql://x@aws-0-us-east-1.pooler.supabase.com:6543/postgres"),
    ).toBe(true);
    expect(isManagedPostgres("postgresql://x@ep-y.neon.tech/db")).toBe(true);
  });

  it("no marca una base local ni un dominio parecido", () => {
    expect(isManagedPostgres("postgresql://x@localhost:5432/db")).toBe(false);
    expect(isManagedPostgres("postgresql://x@supabase.com.malicioso.com/db")).toBe(false);
  });

  it("devuelve false con valores vacíos o inválidos", () => {
    expect(isManagedPostgres(undefined)).toBe(false);
    expect(isManagedPostgres("")).toBe(false);
    expect(isManagedPostgres("cualquier cosa")).toBe(false);
  });
});
