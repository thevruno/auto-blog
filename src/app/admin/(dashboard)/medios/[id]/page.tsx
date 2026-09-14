import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mediaItems } from "@/db/schema";
import MediaForm from "@/components/admin/media-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Editar ítem de medios · Panel" };

export default async function EditMediaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsed = Number(id);

  if (!Number.isInteger(parsed)) notFound();

  const rows = await db
    .select()
    .from(mediaItems)
    .where(eq(mediaItems.id, parsed))
    .limit(1);
  if (!rows[0]) notFound();

  return <MediaForm initial={rows[0]} />;
}
