import type { Metadata } from "next";
import Link from "next/link";
import {
  getCredentials,
  getLatestPosts,
  getMediaItems,
  getSiteProfile,
} from "@/lib/queries";
import { absoluteUrl } from "@/lib/utils";
import CredentialGrid from "@/components/credential-grid";
import PostCard from "@/components/post-card";
import MediaExplorer from "@/components/media-explorer";
import ContactForm from "@/components/contact-form";
import SocialLinks from "@/components/social-links";
import { ArrowRightIcon, MailIcon, MapPinIcon, PhoneIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getSiteProfile();
  const image = profile?.heroPhoto
    ? profile.heroPhoto.startsWith("/")
      ? absoluteUrl(profile.heroPhoto)
      : profile.heroPhoto
    : undefined;
  const name = profile?.name || "Elena Kuchimpos";
  return {
    title: {
      absolute: profile?.roleTitle
        ? `${name} · ${profile.roleTitle}`
        : name,
    },
    description:
      profile?.positioning ||
      "Neuropsicoeducadora, directora del IFOPAC y especialista en altas capacidades e inclusión educativa.",
    openGraph: {
      type: "profile",
      title: profile?.name || "Elena Kuchimpos",
      description: profile?.positioning ?? undefined,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export default async function HomePage() {
  const [profile, credentials, latestPosts, mediaItems] = await Promise.all([
    getSiteProfile(),
    getCredentials(),
    getLatestPosts(3),
    getMediaItems(),
  ]);

  const ogImage = profile?.heroPhoto
    ? profile.heroPhoto.startsWith("/")
      ? absoluteUrl(profile.heroPhoto)
      : profile.heroPhoto
    : undefined;

  const sameAs = [
    profile?.linkedin,
    profile?.instagram,
    profile?.twitter,
    profile?.youtube,
    profile?.facebook,
  ].filter(Boolean) as string[];

  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile?.name ?? "Elena Kuchimpos",
    jobTitle: profile?.roleTitle ?? "",
    description: profile?.bio ?? "",
    url: absoluteUrl("/"),
    image: ogImage ?? undefined,
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-cream">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.15fr_0.85fr] md:py-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-brand-600">
              {profile?.location ? `${profile.location} · ` : ""}Educación con
              evidencia
            </p>
            <h1 className="mt-4 text-balance font-serif text-4xl font-semibold leading-[1.08] text-ink sm:text-5xl md:text-6xl">
              {profile?.name ?? "Elena Kuchimpos"}
            </h1>
            <p className="mt-4 text-lg font-medium text-brand-700">
              {profile?.roleTitle ?? ""}
            </p>
            <p className="mt-4 max-w-xl text-balance font-serif text-xl leading-relaxed text-ink/80">
              “{profile?.positioning ?? ""}”
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
              >
                Leer el blog
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link
                href="/#contacto"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-800 ring-1 ring-brand-200 transition hover:bg-brand-50"
              >
                Escribirme
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-3 -z-10 rotate-2 rounded-3xl bg-accent-200/60" />
            <div className="overflow-hidden rounded-3xl border-4 border-white shadow-xl">
              {profile?.heroPhoto ? (
                <img
                  src={profile.heroPhoto}
                  alt={profile.heroPhotoAlt || `${profile.name} retrato`}
                  className="aspect-[4/5] w-full object-cover"
                />
              ) : (
                <div className="grid aspect-[4/5] w-full place-items-center bg-brand-100 text-6xl">
                  👩‍🏫
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Bio */}
      {profile?.bio && (
        <section className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <p className="text-lg leading-relaxed text-ink/75">{profile.bio}</p>
        </section>
      )}

      {/* Credenciales / infografía de perfil */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-accent-600">
            Perfil profesional
          </p>
          <h2 className="mt-2 text-balance font-serif text-3xl font-semibold text-ink">
            Una trayectoria multidisciplinaria
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-ink/65">
            Tocá cada credencial para conocer más sobre cada rol.
          </p>
        </div>
        <CredentialGrid credentials={credentials} />
      </section>

      {/* Últimas notas */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.15em] text-accent-600">
                Blog
              </p>
              <h2 className="mt-2 font-serif text-3xl font-semibold text-ink">
                Últimas notas
              </h2>
            </div>
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
            >
              Ver todas
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          {latestPosts.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-ink/20 bg-cream/60 p-10 text-center text-ink/60">
              Todavía no hay notas publicadas.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {latestPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* En los medios */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-accent-600">
              Prensa
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-ink">
              En los medios
            </h2>
            <p className="mt-2 max-w-2xl text-ink/65">
              Entrevistas, notas y participaciones en podcasts.
            </p>
          </div>
          <Link
            href="/medios"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
          >
            Ver todos los medios
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
        <MediaExplorer items={mediaItems} />
      </section>

      {/* Contacto */}
      <section id="contacto" className="bg-white py-16">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-accent-600">
              Contacto
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold text-ink">
              Hablemos
            </h2>
            <p className="mt-3 max-w-md text-ink/70">
              ¿Querés coordinar una charla, una capacitación o una consulta?
              Escribime y te respondo a la brevedad.
            </p>

            <ul className="mt-8 space-y-4 text-sm">
              {profile?.email && (
                <li className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-brand-700">
                    <MailIcon className="h-5 w-5" />
                  </span>
                  <a href={`mailto:${profile.email}`} className="font-medium text-ink hover:text-brand-700">
                    {profile.email}
                  </a>
                </li>
              )}
              {profile?.phone && (
                <li className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-brand-700">
                    <PhoneIcon className="h-5 w-5" />
                  </span>
                  <span className="font-medium text-ink">{profile.phone}</span>
                </li>
              )}
              {profile?.location && (
                <li className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-brand-700">
                    <MapPinIcon className="h-5 w-5" />
                  </span>
                  <span className="font-medium text-ink">{profile.location}</span>
                </li>
              )}
            </ul>

            <SocialLinks
              linkedin={profile?.linkedin}
              instagram={profile?.instagram}
              twitter={profile?.twitter}
              youtube={profile?.youtube}
              facebook={profile?.facebook}
              className="mt-8"
              itemClassName="bg-brand-50 text-brand-700 hover:bg-brand-700 hover:text-white"
            />
          </div>

          <div className="rounded-3xl border border-ink/10 bg-cream/50 p-6 sm:p-8">
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
