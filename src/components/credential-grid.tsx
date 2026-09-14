import type { Credential } from "@/db/schema";
import { getIconComponent } from "@/lib/lucide-icons";

export default function CredentialGrid({
  credentials,
}: {
  credentials: Credential[];
}) {
  if (credentials.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/30 p-10 text-center">
        <p className="text-ink/50">
          Todavía no hay credenciales cargadas. Se pueden gestionar desde el panel.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {credentials.map((c) => {
        const LucideIcon = getIconComponent(c.icon);
        return (
          <div
            key={c.id}
            className={`group relative flex flex-col rounded-2xl border bg-white p-5 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5 ${
              c.highlight
                ? "border-accent-300/60 ring-1 ring-accent-200/50"
                : "border-brand-100/60"
            }`}
          >
            {c.highlight && (
              <div className="absolute top-3 right-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-700">
                  Destacado
                </span>
              </div>
            )}

            <div className="flex items-start gap-3.5">
              <span
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl transition-all duration-200 group-hover:scale-105 ${
                  c.highlight
                    ? "bg-gradient-to-br from-accent-100 to-accent-50 text-accent-600 shadow-sm"
                    : "bg-gradient-to-br from-brand-50 to-brand-100/50 text-brand-600"
                }`}
                aria-hidden="true"
              >
                {LucideIcon ? (
                  <LucideIcon className="h-5 w-5" />
                ) : (
                  <span className="text-2xl">{c.icon || "🎓"}</span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-serif text-base font-semibold leading-snug text-ink">
                  {c.title}
                </h3>
                <p className="mt-0.5 text-sm font-medium text-brand-600/80">
                  {c.institution}
                </p>
              </div>
            </div>

            <p className="mt-3.5 text-sm leading-relaxed text-ink/60 line-clamp-3">
              {c.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
