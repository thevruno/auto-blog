"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Home,
  FileText,
  Film,
  Search,
  Mail,
  User,
  Award,
  Globe,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Inicio", icon: Home },
  { href: "/admin/posts", label: "Notas del blog", icon: FileText },
  { href: "/admin/medios", label: "Medios", icon: Film },
  { href: "/admin/rastreo", label: "Rastreo web", icon: Search },
  { href: "/admin/mensajes", label: "Mensajes", icon: Mail },
  { href: "/admin/perfil", label: "Perfil", icon: User },
  { href: "/admin/credenciales", label: "Credenciales", icon: Award },
];

export default function AdminShell({
  user,
  unreadCount = 0,
  newLeadsCount = 0,
  children,
}: {
  user: { name: string; email: string };
  unreadCount?: number;
  newLeadsCount?: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <Link href="/admin" className="flex items-center gap-2.5 px-5 py-5 group">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-700 font-serif text-lg font-semibold text-white shadow-sm transition-all duration-200 group-hover:bg-brand-600 group-hover:scale-105">
          E
        </span>
        <span className="leading-tight">
          <span className="block font-serif text-sm font-semibold text-white">
            Elena Kuchimpos
          </span>
          <span className="block text-xs text-brand-300/80">Panel de gestión</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-0.5 px-3" aria-label="Navegación del panel">
        {NAV.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-brand-700/80 text-white shadow-sm"
                  : "text-brand-200/80 hover:bg-brand-900/50 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.href === "/admin/mensajes" && unreadCount > 0 && (
                <span className="rounded-full bg-accent-500 px-2 py-0.5 text-[10px] font-bold text-brand-950">
                  {unreadCount}
                </span>
              )}
              {item.href === "/admin/rastreo" && newLeadsCount > 0 && (
                <span className="rounded-full bg-accent-500 px-2 py-0.5 text-[10px] font-bold text-brand-950">
                  {newLeadsCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-0.5 border-t border-white/10 p-3">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-brand-200/80 transition-colors duration-200 hover:bg-brand-900/50 hover:text-white"
        >
          <Globe className="h-4 w-4" />
          Ver sitio
        </Link>
        <div className="px-3 py-2.5">
          <p className="truncate text-sm font-medium text-brand-100">{user.name}</p>
          <p className="truncate text-xs text-brand-300/70">{user.email}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-brand-200/80 transition-colors duration-200 hover:bg-brand-900/50 hover:text-white disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {loggingOut ? "Saliendo…" : "Cerrar sesión"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink/[0.03]">
      {/* Barra superior móvil */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-brand-900/20 bg-brand-950 px-4 md:hidden">
        <span className="font-serif text-sm font-semibold text-white">
          Panel de gestión
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="grid h-9 w-9 place-items-center rounded-xl text-white transition-colors duration-200 hover:bg-brand-900"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Sidebar escritorio */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 bg-brand-950 md:block">
        {sidebarContent}
      </aside>

      {/* Drawer móvil con transiciones */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className="absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setOpen(false)}
        />
        <aside
          className={`absolute inset-y-0 left-0 w-72 bg-brand-950 shadow-xl transition-transform duration-300 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-3 top-4 grid h-9 w-9 place-items-center rounded-xl text-brand-200 transition-colors duration-200 hover:bg-brand-900 hover:text-white"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
          {sidebarContent}
        </aside>
      </div>

      <main className="md:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
          {children}
        </div>
      </main>
    </div>
  );
}
