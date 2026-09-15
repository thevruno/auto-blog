"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Field,
  Input,
  PageHeader,
  Spinner,
  Textarea,
} from "@/components/admin/ui";
import ImageField from "@/components/admin/image-field";

type ProfileForm = {
  name: string;
  roleTitle: string;
  positioning: string;
  heroPhoto: string;
  heroPhotoAlt: string;
  bio: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  instagram: string;
  twitter: string;
  youtube: string;
  facebook: string;
};

const EMPTY: ProfileForm = {
  name: "",
  roleTitle: "",
  positioning: "",
  heroPhoto: "",
  heroPhotoAlt: "",
  bio: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  instagram: "",
  twitter: "",
  youtube: "",
  facebook: "",
};

export default function ProfilePage() {
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) {
          const p = d.profile;
          setForm({
            name: p.name ?? "",
            roleTitle: p.roleTitle ?? "",
            positioning: p.positioning ?? "",
            heroPhoto: p.heroPhoto ?? "",
            heroPhotoAlt: p.heroPhotoAlt ?? "",
            bio: p.bio ?? "",
            email: p.email ?? "",
            phone: p.phone ?? "",
            location: p.location ?? "",
            linkedin: p.linkedin ?? "",
            instagram: p.instagram ?? "",
            twitter: p.twitter ?? "",
            youtube: p.youtube ?? "",
            facebook: p.facebook ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const patch = (partial: Partial<ProfileForm>) =>
    setForm((prev) => ({ ...prev, ...partial }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    if (!form.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar el perfil.");
        setSaving(false);
        return;
      }
      setSaving(false);
      setSaved(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Error de conexión al guardar.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-24 text-brand-700">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader
        title="Perfil"
        description="Datos que se muestran en la portada y en el pie del sitio."
        actions={
          <Button type="submit" disabled={saving}>
            {saving ? <Spinner className="h-4 w-4" /> : "Guardar cambios"}
          </Button>
        }
      />

      {saved && (
        <div className="mb-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          ✓ Cambios guardados correctamente.
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <div className="space-y-4 rounded-2xl border border-ink/10 bg-white p-6">
            <h2 className="font-serif text-lg font-semibold text-ink">
              Presentación
            </h2>
            <Field label="Nombre" htmlFor="p-name" required>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </Field>
            <Field
              label="Cargo principal"
              htmlFor="p-role"
              hint="Se muestra debajo del nombre en el hero."
            >
              <Input
                id="p-role"
                value={form.roleTitle}
                onChange={(e) => patch({ roleTitle: e.target.value })}
              />
            </Field>
            <Field
              label="Frase de posicionamiento"
              htmlFor="p-positioning"
              hint="La frase central del hero, entre comillas."
            >
              <Textarea
                id="p-positioning"
                rows={2}
                value={form.positioning}
                onChange={(e) => patch({ positioning: e.target.value })}
              />
            </Field>
            <Field label="Bio" htmlFor="p-bio">
              <Textarea
                id="p-bio"
                rows={6}
                value={form.bio}
                onChange={(e) => patch({ bio: e.target.value })}
              />
            </Field>
          </div>

          <div className="rounded-2xl border border-ink/10 bg-white p-6">
            <h2 className="mb-4 font-serif text-lg font-semibold text-ink">
              Foto de perfil
            </h2>
            <ImageField
              label="Foto para el hero"
              hint="El sitio la muestra en formato retrato 4:5 (400 × 500). Después de elegir el archivo vas a poder ajustar el encuadre."
              value={form.heroPhoto}
              onChange={(url) => patch({ heroPhoto: url })}
              alt={form.heroPhotoAlt}
              onAltChange={(alt) => patch({ heroPhotoAlt: alt })}
              altRequired
              crop={{
                aspect: 4 / 5,
                outputWidth: 800,
                title: "Ajustá el encuadre de tu foto",
                description:
                  "El sitio muestra la foto en formato retrato 4:5, así que acá elegís qué parte se ve. Arrastrá la imagen para moverla y usá el zoom para acercarla.",
              }}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-4 rounded-2xl border border-ink/10 bg-white p-6">
            <h2 className="font-serif text-lg font-semibold text-ink">Contacto</h2>
            <Field label="Email" htmlFor="p-email">
              <Input
                id="p-email"
                type="email"
                value={form.email}
                onChange={(e) => patch({ email: e.target.value })}
              />
            </Field>
            <Field label="Teléfono" htmlFor="p-phone">
              <Input
                id="p-phone"
                value={form.phone}
                onChange={(e) => patch({ phone: e.target.value })}
              />
            </Field>
            <Field label="Ubicación" htmlFor="p-location">
              <Input
                id="p-location"
                value={form.location}
                onChange={(e) => patch({ location: e.target.value })}
              />
            </Field>
          </div>

          <div className="space-y-4 rounded-2xl border border-ink/10 bg-white p-6">
            <h2 className="font-serif text-lg font-semibold text-ink">
              Redes sociales
            </h2>
            <Field label="LinkedIn" htmlFor="p-linkedin">
              <Input
                id="p-linkedin"
                value={form.linkedin}
                onChange={(e) => patch({ linkedin: e.target.value })}
                placeholder="https://linkedin.com/in/…"
              />
            </Field>
            <Field label="Instagram" htmlFor="p-instagram">
              <Input
                id="p-instagram"
                value={form.instagram}
                onChange={(e) => patch({ instagram: e.target.value })}
              />
            </Field>
            <Field label="X (Twitter)" htmlFor="p-twitter">
              <Input
                id="p-twitter"
                value={form.twitter}
                onChange={(e) => patch({ twitter: e.target.value })}
              />
            </Field>
            <Field label="YouTube" htmlFor="p-youtube">
              <Input
                id="p-youtube"
                value={form.youtube}
                onChange={(e) => patch({ youtube: e.target.value })}
              />
            </Field>
            <Field label="Facebook" htmlFor="p-facebook">
              <Input
                id="p-facebook"
                value={form.facebook}
                onChange={(e) => patch({ facebook: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </div>
    </form>
  );
}
