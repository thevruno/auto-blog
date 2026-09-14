"use client";

import { useRef, useState } from "react";
import { Button, Field, Input, Spinner } from "@/components/admin/ui";

export default function ImageField({
  label,
  value,
  onChange,
  alt,
  onAltChange,
  altRequired = false,
  hint,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  alt: string;
  onAltChange: (alt: string) => void;
  altRequired?: boolean;
  hint?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo subir la imagen");
      onChange(data.url);
      if (!alt) onAltChange(file.name.replace(/\.[^.]+$/, ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <Field label={label} hint={hint}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex items-center gap-3">
            <div className="grid h-24 w-36 shrink-0 place-items-center overflow-hidden rounded-lg border border-ink/15 bg-cream text-3xl">
              {value ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={value}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span aria-hidden="true">🖼️</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Spinner className="h-4 w-4" /> : "Subir imagen"}
              </Button>
              {value && (
                <Button type="button" variant="ghost" onClick={() => onChange("")}>
                  Quitar
                </Button>
              )}
            </div>
          </div>
          <div className="flex-1">
            <Input
              type="url"
              placeholder="…o pegá una URL de imagen"
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </Field>

      <Field
        label="Texto alternativo (alt)"
        required={altRequired}
        hint="Describe la imagen. Es obligatorio para accesibilidad y SEO."
      >
        <Input
          value={alt}
          onChange={(e) => onAltChange(e.target.value)}
          placeholder="Ej.: Elena Kuchimpos en una entrevista televisiva"
        />
      </Field>
    </div>
  );
}
