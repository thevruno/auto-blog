import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { getSession } from "@/lib/auth";
import AdminShell from "@/components/admin/shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  const unread =
    (
      await db
        .select({ value: count() })
        .from(messages)
        .where(eq(messages.isRead, false))
    )[0]?.value ?? 0;

  return (
    <AdminShell user={{ name: session.name, email: session.email }} unreadCount={unread}>
      {children}
    </AdminShell>
  );
}
