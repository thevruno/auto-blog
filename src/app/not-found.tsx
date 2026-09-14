import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-cream px-6">
      <div className="max-w-md text-center">
        <p className="font-serif text-7xl font-semibold text-brand-700">404</p>
        <h1 className="mt-4 text-2xl font-semibold text-ink">
          Página no encontrada
        </h1>
        <p className="mt-2 text-ink/70">
          La página que buscás no existe o fue movida.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-brand-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
