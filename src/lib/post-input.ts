import { stripHtml, truncate } from "@/lib/utils";

export function normalizeTags(input: unknown): string[] {
  if (Array.isArray(input)) {
    return Array.from(
      new Set(
        input
          .map((t) => String(t).trim())
          .filter(Boolean)
          .map((t) => t.slice(0, 60)),
      ),
    );
  }
  if (typeof input === "string") {
    return Array.from(
      new Set(
        input
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .map((t) => t.slice(0, 60)),
      ),
    );
  }
  return [];
}

export function deriveExcerpt(content: string, fallback: string): string {
  if (fallback && fallback.trim()) return fallback.trim();
  return truncate(stripHtml(content), 160);
}

export function computePublishedAt(status: string, raw: unknown): Date | null {
  if (status !== "published") return null;
  if (raw && typeof raw === "string" && raw.length > 0) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}
