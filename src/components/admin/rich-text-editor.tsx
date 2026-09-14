"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { useRef, useState } from "react";

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`grid h-8 min-w-8 place-items-center rounded-md px-1.5 text-sm font-semibold transition ${
        active ? "bg-brand-700 text-white" : "text-ink/70 hover:bg-ink/5"
      } disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "No se pudo subir la imagen");
  return data.url as string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Escribí el contenido de la nota…",
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ allowBase64: false }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm prose-slate max-w-none min-h-[320px] focus:outline-none px-4 py-3",
      },
    },
  });

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      const alt = window.prompt(
        "Describí la imagen (texto alternativo, obligatorio para accesibilidad y SEO):",
        "",
      )?.trim();
      editor.chain().focus().setImage({ src: url, alt: alt || file.name }).run();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "No se pudo subir la imagen");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function addImageByUrl() {
    if (!editor) return;
    const url = window.prompt("Pegá la URL de la imagen:", "")?.trim();
    if (!url) return;
    const alt = window.prompt("Texto alternativo de la imagen:", "")?.trim();
    editor.chain().focus().setImage({ src: url, alt: alt || "" }).run();
  }

  function setLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL del enlace:", prev || "https://")?.trim();
    if (url === null) return;
    if (!url) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  if (!editor) {
    return (
      <div className="grid min-h-[320px] place-items-center rounded-lg border border-ink/15 bg-white text-sm text-ink/50">
        Cargando editor…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-ink/15 bg-white">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-ink/10 bg-cream/60 p-1.5">
        <ToolbarButton
          label="Negrita"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          label="Cursiva"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          label="Subrayado"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton
          label="Tachado"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <span className="line-through">S</span>
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-ink/15" />

        <ToolbarButton
          label="Título (H2)"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          label="Subtítulo (H3)"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-ink/15" />

        <ToolbarButton
          label="Lista con viñetas"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • Lista
        </ToolbarButton>
        <ToolbarButton
          label="Lista numerada"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. Lista
        </ToolbarButton>
        <ToolbarButton
          label="Cita"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          ❝
        </ToolbarButton>

        <span className="mx-1 h-5 w-px bg-ink/15" />

        <ToolbarButton label="Insertar enlace" onClick={setLink}>
          🔗
        </ToolbarButton>
        <ToolbarButton
          label="Insertar imagen"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "…" : "🖼️"}
        </ToolbarButton>
        <ToolbarButton label="Imagen por URL" onClick={addImageByUrl}>
          ⤓ URL
        </ToolbarButton>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      <EditorContent editor={editor} />
    </div>
  );
}
