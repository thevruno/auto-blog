"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Spinner } from "@/components/admin/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo iniciar sesión.");
        setLoading(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Error de conexión. Reintentá.");
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-brand-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-700 font-serif text-xl font-semibold text-white">
            E
          </span>
          <h1 className="mt-4 font-serif text-2xl font-semibold text-white">
            Panel de gestión
          </h1>
          <p className="mt-1 text-sm text-brand-300">
            Elena Kuchimpos · Acceso administradora
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-6 shadow-xl"
        >
          <div className="space-y-4">
            <Field label="Email" htmlFor="login-email">
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
              />
            </Field>
            <Field label="Contraseña" htmlFor="login-password">
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="mt-5 w-full">
            {loading ? <Spinner className="h-4 w-4" /> : "Ingresar"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-brand-300">
          <a href="/" className="hover:text-white">
            ← Volver al sitio público
          </a>
        </p>
      </div>
    </main>
  );
}
