"use client";

import { useEffect } from "react";

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-3xl border border-brand-100 bg-white p-10 shadow-card">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-3xl">
          ⚠️
        </div>
        <h2 className="mt-6 font-serif text-2xl font-semibold text-ink">
          Algo salió mal
        </h2>
        <p className="mt-2 max-w-sm text-sm text-ink/60">
          Ocurrió un error inesperado. Por favor, intentá de nuevo.
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-full bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-brand-800 hover:shadow-md active:scale-[0.98]"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
