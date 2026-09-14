import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: {
    default: "Elena Kuchimpos · Neuropsicoeducadora y Directora del IFOPAC",
    template: "%s · Elena Kuchimpos",
  },
  description:
    "Neuropsicoeducadora, directora del IFOPAC y especialista en altas capacidades, inclusión educativa y formación docente.",
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Elena Kuchimpos",
    title: "Elena Kuchimpos · Neuropsicoeducadora y Directora del IFOPAC",
    description:
      "Neuropsicoeducadora, directora del IFOPAC y especialista en altas capacidades, inclusión educativa y formación docente.",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  themeColor: "#285b59",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
