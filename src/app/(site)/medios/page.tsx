import type { Metadata } from "next";
import { getMediaItems } from "@/lib/queries";
import MediaExplorer from "@/components/media-explorer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Medios",
  description:
    "Entrevistas, notas de prensa, videos y podcasts en los que participó Elena Kuchimpos.",
};

export default async function MediosPage() {
  const items = await getMediaItems();

  return (
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
  );
}
