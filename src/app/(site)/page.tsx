import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
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
import { ArrowRight, Mail, Phone, MapPin } from "lucide-react";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getSiteProfile();
  const image = profile?.heroPhoto
    ? profile.heroPhoto.startsWith("/")
      ? absoluteUrl(profile.heroPhoto)
      : profile.heroPhoto
    : absoluteUrl("/og-default.png");
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
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      title: profile?.name || "Elena Kuchimpos",
      description: profile?.positioning ?? undefined,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${name} - Neuropsicoeducadora`,
        },
      ],
    },
    twitter: {
      images: [image],
    },
  };
}

export default async function HomePage() {
  const [profile, credentials, latestPosts, mediaItems] = await Promise.all([
    getSiteProfile(),
    getCredentials(),
    getLatestPosts(3),
    getMediaItems(undefined, 6),
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

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: profile?.name ?? "Elena Kuchimpos",
    url: absoluteUrl("/"),
    description:
      profile?.positioning ||
      "Neuropsicoeducadora, directora del IFOPAC y especialista en altas capacidades e inclusión educativa.",
    publisher: {
      "@type": "Person",
      name: profile?.name ?? "Elena Kuchimpos",
      image: ogImage ?? undefined,
    },
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "IFOPAC",
    url: absoluteUrl("/"),
    description: profile?.bio ?? undefined,
    ...(ogImage ? { logo: ogImage } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />

      {/* Hero */}
      <section className="relative flex min-h-screen items-center overflow-hidden bg-gradient-to-br from-brand-50 via-cream to-accent-50/30">
        {/* Formas decorativas - matches photo container style */}
        <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-accent-200/40 blur-3xl" />
        <div className="absolute top-1/4 -right-24 h-[400px] w-[400px] rounded-full bg-brand-200/30 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-[350px] w-[350px] rounded-full bg-brand-300/20 blur-3xl" />
        <div className="absolute bottom-1/4 left-0 h-[300px] w-[300px] rounded-full bg-accent-100/40 blur-3xl" />

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-32 sm:px-6 md:grid-cols-[1.15fr_0.85fr]">
          <div className="animate-fade-in">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-600">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              {profile?.location ? `${profile.location} · ` : ""}Educación con evidencia
            </span>
            <h1 className="mt-5 text-balance font-script text-5xl font-normal leading-[1.1] text-ink sm:text-6xl md:text-7xl">
              {profile?.name ?? "Elena Kuchimpos"}
            </h1>
            <p className="mt-4 text-lg font-medium text-brand-600">
              {profile?.roleTitle ?? ""}
            </p>
            <p className="mt-5 max-w-xl text-balance font-serif text-xl leading-relaxed text-ink/75">
              &ldquo;{profile?.positioning ?? ""}&rdquo;
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/blog"
                className="group inline-flex items-center gap-2 rounded-full bg-brand-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-brand-800 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
              >
                Leer el blog
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/#contacto"
                className="inline-flex items-center gap-2 rounded-full bg-white/70 px-6 py-3 text-sm font-semibold text-brand-800 ring-1 ring-brand-200/60 backdrop-blur-sm transition-all duration-200 hover:bg-white hover:ring-brand-300 hover:shadow-sm"
              >
                Escribime
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm animate-slide-up-delay-1">
            {/* Decoración detrás de la foto */}
            <div className="absolute -inset-4 -z-10">
              <div className="absolute inset-0 rotate-2 rounded-[2rem] bg-gradient-to-br from-accent-200/50 to-brand-200/40" />
              <div className="absolute inset-0 -rotate-1 rounded-[2rem] bg-gradient-to-tl from-brand-300/20 to-transparent" />
            </div>
            <div className="overflow-hidden rounded-[2rem] border-[3px] border-white shadow-elevated">
              {profile?.heroPhoto ? (
                <Image
                  src={profile.heroPhoto}
                  alt={profile.heroPhotoAlt || `${profile.name} retrato`}
                  width={400}
                  height={500}
                  sizes="(max-width: 768px) 100vw, 400px"
                  className="aspect-[4/5] w-full object-cover"
                  priority
                />
              ) : (
                <div className="grid aspect-[4/5] w-full place-items-center bg-gradient-to-br from-brand-100 to-brand-200/50 text-6xl">
                  👩‍🏫
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="h-6 w-10 rounded-full border-2 border-brand-400/50 flex items-start justify-center pt-2">
            <div className="h-1.5 w-1.5 rounded-full bg-brand-500/60" />
          </div>
        </div>
      </section>

      {/* Bio */}
      {profile?.bio && (
        <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <p className="text-lg leading-relaxed text-ink/70">{profile.bio}</p>
        </section>
      )}

      {/* Credenciales */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent-100/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent-700">
            Perfil profesional
          </span>
          <h2 className="mt-4 text-balance font-serif text-3xl font-semibold text-ink sm:text-4xl">
            Una trayectoria multidisciplinaria
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-ink/60">
            Tocá cada credencial para conocer más sobre cada rol.
          </p>
        </div>
        <CredentialGrid credentials={credentials} />
      </section>

      {/* Últimas notas */}
      <section className="relative bg-white py-20">
        {/* Forma decorativa */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent" />

        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-100/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-700">
                Blog
              </span>
              <h2 className="mt-4 font-serif text-3xl font-semibold text-ink sm:text-4xl">
                Últimas notas
              </h2>
            </div>
            <Link
              href="/blog"
              className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-800"
            >
              Ver todas
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>

          {latestPosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/30 p-12 text-center">
              <p className="text-ink/50">Todavía no hay notas publicadas.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {latestPosts.map((post, i) => (
                <div key={post.id} className="animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                  <PostCard post={post} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* En los medios */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-100/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent-700">
              Prensa
            </span>
            <h2 className="mt-4 font-serif text-3xl font-semibold text-ink sm:text-4xl">
              En los medios
            </h2>
            <p className="mt-2 max-w-2xl text-ink/60">
              Entrevistas, notas y participaciones en podcasts.
            </p>
          </div>
          <Link
            href="/medios"
            className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-800"
          >
            Ver todos los medios
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
        <MediaExplorer items={mediaItems} />
      </section>

      {/* Contacto */}
      <section id="contacto" className="relative bg-white py-20">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent" />

        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-100/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-700">
              Contacto
            </span>
            <h2 className="mt-4 font-serif text-3xl font-semibold text-ink sm:text-4xl">
              Hablemos
            </h2>
            <p className="mt-3 max-w-md text-ink/65">
              ¿Querés coordinar una charla, una capacitación o una consulta?
              Escribime y te respondo a la brevedad.
            </p>

            <ul className="mt-8 space-y-4">
              {profile?.email && (
                <li className="flex items-center gap-4">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600 transition-colors duration-200 group-hover:bg-brand-100">
                    <Mail className="h-5 w-5" />
                  </span>
                  <a href={`mailto:${profile.email}`} className="font-medium text-ink transition-colors duration-200 hover:text-brand-700">
                    {profile.email}
                  </a>
                </li>
              )}
              {profile?.phone && (
                <li className="flex items-center gap-4">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <Phone className="h-5 w-5" />
                  </span>
                  <span className="font-medium text-ink">{profile.phone}</span>
                </li>
              )}
              {profile?.location && (
                <li className="flex items-center gap-4">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <MapPin className="h-5 w-5" />
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
              itemClassName="bg-brand-50 text-brand-600 hover:bg-brand-700 hover:text-white"
            />
          </div>

          <div className="rounded-3xl border border-brand-100 bg-cream/50 p-6 shadow-card sm:p-8">
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
