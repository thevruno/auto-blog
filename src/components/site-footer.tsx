import Link from "next/link";
import type { SiteProfile } from "@/db/schema";
import SocialLinks from "@/components/social-links";
import { Mail, MapPin } from "lucide-react";

export default function SiteFooter({
  profile,
}: {
  profile: SiteProfile | null;
}) {
  return (
    <footer className="relative mt-20 bg-brand-950 text-brand-100">
      {/* Onda decorativa superior */}
      <div className="absolute -top-px left-0 right-0 overflow-hidden">
        <svg viewBox="0 0 1440 40" fill="none" className="w-full text-brand-950">
          <path d="M0 0V20C360 40 720 0 1080 20C1260 30 1380 35 1440 40V0H0Z" fill="currentColor" />
        </svg>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-16 pb-10 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-700 font-serif text-lg font-semibold text-white">
              E
            </span>
            <p className="font-serif text-xl font-semibold text-white">
              Elena Kuchimpos
            </p>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-brand-300/80">
            {profile?.positioning ||
              "Neuropsicoeducadora y especialista en altas capacidades e inclusión educativa."}
          </p>
          <SocialLinks
            linkedin={profile?.linkedin}
            instagram={profile?.instagram}
            twitter={profile?.twitter}
            youtube={profile?.youtube}
            facebook={profile?.facebook}
            className="mt-6"
            itemClassName="bg-brand-900/80 text-brand-200 hover:bg-accent-500 hover:text-white"
          />
        </div>

        <nav aria-label="Navegación del pie">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-400/70">
            Navegación
          </p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              { href: "/", label: "Inicio" },
              { href: "/blog", label: "Blog" },
              { href: "/medios", label: "Medios" },
              { href: "/#contacto", label: "Contacto" },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-brand-200/70 transition-colors duration-200 hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-400/70">
            Contacto
          </p>
          <ul className="mt-4 space-y-3 text-sm">
            {profile?.email && (
              <li className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-900/60 text-brand-400">
                  <Mail className="h-4 w-4" />
                </span>
                <a
                  href={`mailto:${profile.email}`}
                  className="text-brand-200/70 transition-colors duration-200 hover:text-white"
                >
                  {profile.email}
                </a>
              </li>
            )}
            {profile?.location && (
              <li className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-900/60 text-brand-400">
                  <MapPin className="h-4 w-4" />
                </span>
                <span className="text-brand-200/70">{profile.location}</span>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-brand-400/60 sm:flex-row sm:px-6">
          <p>
            © {new Date().getFullYear()} Elena Kuchimpos. Todos los derechos
            reservados.
          </p>
          <Link
            href="/admin"
            className="transition-colors duration-200 hover:text-brand-200"
          >
            Acceso al panel
          </Link>
        </div>
      </div>
    </footer>
  );
}
