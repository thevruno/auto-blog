"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { CloseIcon, LogoutIcon, MenuIcon } from "@/components/icons";

const NAV = [
  { href: "/admin", label: "Inicio", icon: "🏠" },
  { href: "/admin/posts", label: "Notas del blog", icon: "📝" },
  { href: "/admin/medios", label: "Medios", icon: "🎬" },
  { href: "/admin/mensajes", label: "Mensajes", icon: "✉️" },
  { href: "/admin/perfil", label: "Perfil", icon: "👤" },
  { href: "/admin/credenciales", label: "Credenciales", icon: "🏆" },
];

export default function AdminShell({
  user,
  unreadCount = 0,
  children,
}: {
  user: { name: string; email: string };
  unreadCount?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <Link href="/admin" className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-700 font-serif text-lg font-semibold text-white">
          E
        </span>
        <span className="leading-tight">
          <span className="block font-serif text-sm font-semibold text-white">
            Elena Kuchimpos
          </span>
          <span className="block text-xs text-brand-300">Panel de gestión</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-1 px-3" aria-label="Navegación del panel">
        {NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-brand-700 text-white"
                  : "text-brand-100 hover:bg-brand-900 hover:text-white"
              }`}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.href === "/admin/mensajes" && unreadCount > 0 && (
                <span className="rounded-full bg-accent-400 px-2 py-0.5 text-xs font-bold text-brand-950">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-white/10 p-3">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-brand-100 hover:bg-brand-900 hover:text-white"
        >
          <span aria-hidden="true">🌐</span> Ver sitio
        </Link>
        <div className="px-3 py-2 text-xs text-brand-300">
          <p className="truncate font-medium text-brand-100">{user.name}</p>
          <p className="truncate">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-brand-100 hover:bg-brand-900 hover:text-white disabled:opacity-50"
        >
          <LogoutIcon className="h-4 w-4" />
          {loggingOut ? "Saliendo…" : "Cerrar sesión"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink/[0.03]">
      {/* Barra superior móvil */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-ink/10 bg-brand-900 px-4 md:hidden">
        <span className="font-serif text-sm font-semibold text-white">
          Panel de gestión
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="grid h-9 w-9 place-items-center rounded-lg text-white"
          aria-label="Abrir menú"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Sidebar escritorio */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 bg-brand-950 md:block">
        {sidebarContent}
      </aside>

      {/* Drawer móvil */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-brand-950 shadow-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 grid h-9 w-9 place-items-center rounded-lg text-brand-100"
              aria-label="Cerrar menú"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      <main className="md:pl-64">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-10">
          {children}
        </div>
      </main>
    </div>
  );
}
