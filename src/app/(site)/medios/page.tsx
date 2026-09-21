import type { Metadata } from "next";
import { getMediaItems } from "@/lib/queries";
import MediaExplorer from "@/components/media-explorer";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Medios",
  description:
    "Entrevistas, notas de prensa, videos y podcasts en los que participó Elena Kuchimpos.",
  alternates: {
    canonical: "/medios",
  },
  openGraph: {
    title: "Medios · Elena Kuchimpos",
    description:
      "Entrevistas, notas de prensa, videos y podcasts en los que participó Elena Kuchimpos.",
    type: "website",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Medios - Elena Kuchimpos",
      },
    ],
  },
};

export default async function MediosPage() {
  const items = await getMediaItems();

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Inicio",
        item: absoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Medios",
        item: absoluteUrl("/medios"),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <div className="mx-auto max-w-6xl px-4 pt-20 pb-12 sm:px-6">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-accent-600">
          Medios
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold text-ink">
          Entrevistas y notas de prensa
        </h1>
        <p className="mt-3 text-ink/70">
          Participaciones en televisión, radio, medios digitales y podcasts
          hablando de educación, altas capacidades e inclusión.
        </p>
      </header>

      <div className="mt-10">
        <MediaExplorer items={items} />
      </div>
    </div>
    </>
  );
}
