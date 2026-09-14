import { eq } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function requireAdmin() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

export async function uniquePostSlug(
  base: string,
  excludeId?: number,
): Promise<string> {
  const root = base || "publicacion";
  let candidate = root;
  let i = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rows = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.slug, candidate))
      .limit(1);
    const conflict = rows[0] && rows[0].id !== excludeId;
    if (!conflict) return candidate;
    candidate = `${root}-${i}`;
    i += 1;
  }
}
