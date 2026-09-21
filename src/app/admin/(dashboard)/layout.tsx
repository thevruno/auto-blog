import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { count, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { discoveryLeads, messages } from "@/db/schema";
import { ensureSchemaSafe } from "@/db/bootstrap";
import { getSession } from "@/lib/auth";
import AdminShell from "@/components/admin/shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: {
    index: false,
    follow: false,
  },
};

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

  // Hallazgos del rastreo web sin revisar (si el módulo ya está migrado).
  let newLeads = 0;
  if (await ensureSchemaSafe()) {
    newLeads =
      (
        await db
          .select({ value: count() })
          .from(discoveryLeads)
          .where(inArray(discoveryLeads.status, ["new"]))
      )[0]?.value ?? 0;
  }

  return (
    <AdminShell
      user={{ name: session.name, email: session.email }}
      unreadCount={unread}
      newLeadsCount={newLeads}
    >
      {children}
    </AdminShell>
  );
}
