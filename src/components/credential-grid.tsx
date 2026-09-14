import type { Credential } from "@/db/schema";
import { ChevronDown } from "lucide-react";

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
      {credentials.map((c) => (
        <details
          key={c.id}
          className={`group rounded-2xl border bg-white p-5 shadow-card transition-all duration-300 hover:shadow-card-hover ${
            c.highlight
              ? "border-accent-300/60 ring-1 ring-accent-200/50"
              : "border-brand-100/60"
          }`}
        >
          <summary className="flex cursor-pointer list-none items-start gap-3 [&::-webkit-details-marker]:hidden">
            <span
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl transition-colors duration-200 ${
                c.highlight
                  ? "bg-gradient-to-br from-accent-100 to-accent-50"
                  : "bg-gradient-to-br from-brand-50 to-brand-100/50"
              }`}
              aria-hidden="true"
            >
              {c.icon || "🎓"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-serif text-base font-semibold leading-snug text-ink">
                {c.title}
              </span>
              <span className="mt-0.5 block text-sm leading-snug text-ink/55">
                {c.institution}
              </span>
            </span>
            <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-ink/30 transition-transform duration-300 group-open:rotate-180" />
          </summary>
          <div className="mt-3 border-t border-brand-100/60 pt-3">
            <p className="text-sm leading-relaxed text-ink/65">
              {c.description}
            </p>
          </div>
        </details>
      ))}
    </div>
  );
}
