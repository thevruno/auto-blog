import type { Credential } from "@/db/schema";
import { ChevronDownIcon } from "@/components/icons";

export default function CredentialGrid({
  credentials,
}: {
  credentials: Credential[];
}) {
  if (credentials.length === 0) {
    return (
      <p className="text-ink/60">
        Todavía no hay credenciales cargadas. Se pueden gestionar desde el
        panel.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {credentials.map((c) => (
        <details
          key={c.id}
          className={`group rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
            c.highlight ? "border-accent-400 ring-1 ring-accent-300" : "border-ink/10"
          }`}
        >
          <summary className="flex cursor-pointer list-none items-start gap-3 [&::-webkit-details-marker]:hidden">
            <span
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl ${
                c.highlight ? "bg-accent-100" : "bg-brand-50"
              }`}
              aria-hidden="true"
            >
              {c.icon || "🎓"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-serif text-base font-semibold leading-snug text-ink">
                {c.title}
              </span>
              <span className="mt-0.5 block text-sm leading-snug text-ink/60">
                {c.institution}
              </span>
            </span>
            <ChevronDownIcon className="mt-1 h-4 w-4 shrink-0 text-ink/40 transition group-open:rotate-180" />
          </summary>
          <p className="mt-3 border-t border-ink/10 pt-3 text-sm leading-relaxed text-ink/70">
            {c.description}
          </p>
        </details>
      ))}
    </div>
  );
}
