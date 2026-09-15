import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const { GET } = await import("@/app/api/uploads/[file]/route");

const UPLOADS_DIR = path.join(process.cwd(), "storage", "uploads");
const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);
const SVG = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`);

const files = ["prueba-test.png", "prueba-test.svg", "prueba-test.html", "prueba-test.bin"];

function request(file: string) {
  return new NextRequest(`http://localhost:3000/api/uploads/${file}`);
}

function context(file: string) {
  return { params: Promise.resolve({ file }) };
}

beforeAll(async () => {
  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(path.join(UPLOADS_DIR, "prueba-test.png"), PNG);
  await writeFile(path.join(UPLOADS_DIR, "prueba-test.svg"), SVG);
  await writeFile(path.join(UPLOADS_DIR, "prueba-test.html"), "<h1>hola</h1>");
  await writeFile(path.join(UPLOADS_DIR, "prueba-test.bin"), "binario");
});

afterAll(async () => {
  for (const file of files) {
    await rm(path.join(UPLOADS_DIR, file), { force: true });
  }
});

describe("GET /api/uploads/[file]", () => {
  it("sirve una imagen con su tipo y sin sniffing", async () => {
    const response = await GET(request("prueba-test.png"), context("prueba-test.png"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Cache-Control")).toContain("immutable");

    const received = Buffer.from(await response.arrayBuffer());
    expect(received.equals(PNG)).toBe(true);
  });

  it("sirve los SVG viejos como descarga y con CSP restrictiva", async () => {
    const response = await GET(request("prueba-test.svg"), context("prueba-test.svg"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/svg+xml");
    expect(response.headers.get("Content-Security-Policy")).toContain("sandbox");
    expect(response.headers.get("Content-Disposition")).toContain("attachment");
  });

  it("no sirve extensiones fuera de la lista blanca", async () => {
    expect((await GET(request("prueba-test.html"), context("prueba-test.html"))).status).toBe(404);
    expect((await GET(request("prueba-test.bin"), context("prueba-test.bin"))).status).toBe(404);
  });

  it("devuelve 404 si el archivo no existe", async () => {
    const response = await GET(request("no-existe.png"), context("no-existe.png"));
    expect(response.status).toBe(404);
  });

  it("no permite salir de la carpeta de uploads", async () => {
    const response = await GET(
      request("../../../etc/passwd"),
      context("../../../etc/passwd"),
    );
    expect(response.status).toBe(404);
  });

  it("no sirve archivos sin extensión", async () => {
    const response = await GET(request("prueba-test"), context("prueba-test"));
    expect(response.status).toBe(404);
  });
});
