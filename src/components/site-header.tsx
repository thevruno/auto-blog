"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

const NAV = [
  { href: "/", label: "Inicio" },
  { href: "/blog", label: "Blog" },
  { href: "/medios", label: "Medios" },
  { href: "/#contacto", label: "Contacto" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on navigation (back/forward, link clicks)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "glass border-b border-brand-900/5 shadow-sm"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 group"
            onClick={() => setOpen(false)}
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-700 font-serif text-lg font-semibold text-white shadow-sm transition-all duration-300 group-hover:bg-brand-600 group-hover:shadow-md group-hover:scale-105">
              E
            </span>
            <span className="font-serif text-lg font-semibold leading-tight text-ink transition-colors duration-200 group-hover:text-brand-700">
              Elena Kuchimpos
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Navegación principal">
            {NAV.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-brand-700 text-white shadow-sm"
                      : "text-ink/70 hover:bg-brand-50 hover:text-brand-800"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/#contacto"
              className="ml-3 rounded-full bg-accent-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-accent-600 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              Escribime
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="relative z-50 grid h-10 w-10 place-items-center rounded-xl text-ink transition-colors duration-200 hover:bg-brand-50 md:hidden"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
          >
            <span className="absolute transition-all duration-300" style={{ opacity: open ? 0 : 1, transform: open ? "rotate(90deg) scale(0.8)" : "rotate(0) scale(1)" }}>
              <Menu className="h-5 w-5" />
            </span>
            <span className="absolute transition-all duration-300" style={{ opacity: open ? 1 : 0, transform: open ? "rotate(0) scale(1)" : "rotate(-90deg) scale(0.8)" }}>
              <X className="h-5 w-5" />
            </span>
          </button>
        </div>
      </header>

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile nav */}
      <nav
        className={`fixed top-16 left-0 right-0 z-40 md:hidden transition-all duration-300 ${
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
        aria-label="Navegación móvil"
      >
        <div className="glass border-b border-brand-900/5 mx-4 mt-2 rounded-2xl shadow-elevated p-3">
          <div className="flex flex-col gap-1">
            {NAV.map((item, i) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    active
                      ? "bg-brand-700 text-white"
                      : "text-ink/80 hover:bg-brand-50 hover:text-brand-800"
                  }`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="my-1 border-t border-brand-900/5" />
            <Link
              href="/#contacto"
              onClick={() => setOpen(false)}
              className="rounded-xl bg-accent-500 px-4 py-3 text-sm font-semibold text-white text-center transition-all duration-200 hover:bg-accent-600"
            >
              Escribime
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}
