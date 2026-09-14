"use client";

import { useState } from "react";
import { LUCIDE_ICON_MAP, LUCIDE_ICON_OPTIONS } from "@/lib/lucide-icons";
import { Search } from "lucide-react";

export default function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = LUCIDE_ICON_OPTIONS.filter((name) =>
    name.toLowerCase().includes(search.toLowerCase()),
  );

  // Show selected icon preview
  const SelectedIcon = LUCIDE_ICON_MAP[value];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-ink/50">Seleccionado:</span>
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
          {SelectedIcon ? (
            <SelectedIcon className="h-5 w-5" />
          ) : (
            <span className="text-lg">{value || "🎓"}</span>
          )}
        </span>
        <span className="text-xs font-medium text-ink/70">{value || "—"}</span>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar icono…"
          className="w-full rounded-lg border border-brand-100 bg-white py-1.5 pl-8 pr-3 text-xs text-ink placeholder:text-ink/30 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-200"
        />
      </div>

      <div className="grid max-h-48 grid-cols-6 gap-1 overflow-y-auto rounded-lg border border-brand-100 bg-white p-1.5">
        {filtered.map((name) => {
          const Icon = LUCIDE_ICON_MAP[name];
          const isSelected = value === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              title={name}
              className={`group relative grid h-9 w-9 place-items-center rounded-lg text-ink/60 transition-all duration-150 ${
                isSelected
                  ? "bg-brand-700 text-white shadow-sm"
                  : "hover:bg-brand-50 hover:text-brand-700"
              }`}
            >
              {Icon && <Icon className="h-4 w-4" />}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-6 py-3 text-center text-xs text-ink/40">
            No se encontraron iconos.
          </p>
        )}
      </div>
    </div>
  );
}
