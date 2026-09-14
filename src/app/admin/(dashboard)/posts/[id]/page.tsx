import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@/db/schema";
import PostForm from "@/components/admin/post-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Editar nota · Panel" };

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsed = Number(id);

  if (!Number.isInteger(parsed)) notFound();

  const rows = await db.select().from(posts).where(eq(posts.id, parsed)).limit(1);
  if (!rows[0]) notFound();

  return <PostForm initial={rows[0]} />;
}
