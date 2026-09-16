"use client";

import { useRef, useState } from "react";
import { Button, Field, Input, Spinner } from "@/components/admin/ui";
import ImageCropper, { type CropSettings } from "@/components/admin/image-cropper";

/** Alto de la previsualización, en píxeles. */
const PREVIEW_HEIGHT = 96;

export default function ImageField({
  label,
  value,
  onChange,
  alt,
  onAltChange,
  altRequired = false,
  hint,
  crop,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  alt: string;
  onAltChange: (alt: string) => void;
  altRequired?: boolean;
  hint?: string;
  /**
   * Si se indica, al elegir un archivo se abre el recortador con este encuadre
   * antes de subir la imagen. La previsualización respeta la misma proporción,
   * para que se vea igual que en el sitio.
   */
  crop?: CropSettings;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  /** Sube el archivo y devuelve el error hacia arriba si falla. */
  async function upload(file: File) {
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
      const message =
        err instanceof Error ? err.message : "No se pudo subir la imagen";
      setError(message);
      throw new Error(message);
    } finally {
      setUploading(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;

    if (crop) {
      setError("");
      setPendingFile(file);
      return;
    }

    await upload(file).catch(() => {
      // El mensaje ya quedó guardado en `error`.
    });
  }

  async function confirmCrop(cropped: File) {
    await upload(cropped);
    setPendingFile(null);
  }

  const previewWidth = crop
    ? Math.round(PREVIEW_HEIGHT * crop.aspect)
    : 144;

  return (
    <div className="space-y-3">
      <Field
        label={label}
        hint={
          hint ??
          (crop
            ? `Después de elegir el archivo vas a poder ajustar el encuadre ${crop.aspect === 1 ? "cuadrado" : "de la foto"}.`
            : undefined)
        }
      >
<div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 w-full">
            <div
              className="grid shrink-0 place-items-center overflow-hidden rounded-lg border border-ink/15 bg-cream text-3xl w-full sm:w-auto"
              style={{ width: '100%', height: PREVIEW_HEIGHT, maxWidth: previewWidth }}
            >
            {value ? (
              // eslint-disable-next-line @next/next/no-img-element -- previsualización del archivo subido (puede venir de Supabase, del disco o de una URL externa).
              <img
                src={value}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span aria-hidden="true">🖼️</span>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full sm:w-auto"
            >
              {uploading ? <Spinner className="h-4 w-4" /> : "Subir imagen"}
            </Button>
            {value && (
              <Button type="button" variant="ghost" onClick={() => onChange("")} className="w-full sm:w-auto">
                Quitar
              </Button>
            )}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
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

      {pendingFile && crop && (
        <ImageCropper
          file={pendingFile}
          settings={crop}
          onCancel={() => setPendingFile(null)}
          onConfirm={confirmCrop}
        />
      )}
    </div>
  );
}
