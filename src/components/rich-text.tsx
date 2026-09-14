import { sanitizeHtml } from "@/lib/utils";

export default function RichText({
  html,
  className = "",
}: {
  html: string;
  className?: string;
}) {
  return (
    <div
      className={`prose prose-lg prose-slate max-w-none prose-headings:font-serif prose-headings:text-brand-900 prose-a:font-medium prose-a:text-brand-700 prose-article ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
    />
  );
}
