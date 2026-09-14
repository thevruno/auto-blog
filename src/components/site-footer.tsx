import Link from "next/link";
import type { SiteProfile } from "@/db/schema";
import SocialLinks from "@/components/social-links";
import { MailIcon, MapPinIcon } from "@/components/icons";

export default function SiteFooter({
  profile,
}: {
  profile: SiteProfile | null;
}) {
  return (
    <footer className="mt-20 bg-brand-950 text-brand-100">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <p className="font-serif text-xl font-semibold text-white">
            Elena Kuchimpos
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-brand-200">
            {profile?.positioning ||
              "Neuropsicoeducadora y especialista en altas capacidades e inclusión educativa."}
          </p>
          <SocialLinks
            linkedin={profile?.linkedin}
            instagram={profile?.instagram}
            twitter={profile?.twitter}
            youtube={profile?.youtube}
            facebook={profile?.facebook}
            className="mt-5"
            itemClassName="bg-brand-900 text-brand-100 hover:bg-accent-500 hover:text-white"
          />
        </div>

        <nav aria-label="Navegación del pie">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-300">
            Navegación
          </p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href="/" className="hover:text-white">
                Inicio
              </Link>
            </li>
            <li>
              <Link href="/blog" className="hover:text-white">
                Blog
              </Link>
            </li>
            <li>
              <Link href="/medios" className="hover:text-white">
                Medios
              </Link>
            </li>
            <li>
              <Link href="/#contacto" className="hover:text-white">
                Contacto
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-300">
            Contacto
          </p>
          <ul className="mt-4 space-y-3 text-sm">
            {profile?.email && (
              <li className="flex items-center gap-2">
                <MailIcon className="h-4 w-4 text-brand-300" />
                <a href={`mailto:${profile.email}`} className="hover:text-white">
                  {profile.email}
                </a>
              </li>
            )}
            {profile?.location && (
              <li className="flex items-center gap-2">
                <MapPinIcon className="h-4 w-4 text-brand-300" />
                <span>{profile.location}</span>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-brand-300 sm:flex-row sm:px-6">
          <p>
            © {new Date().getFullYear()} Elena Kuchimpos. Todos los derechos
            reservados.
          </p>
          <Link href="/admin" className="hover:text-white">
            Acceso al panel
          </Link>
        </div>
      </div>
    </footer>
  );
}
