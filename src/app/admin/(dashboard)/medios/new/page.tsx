import type { Metadata } from "next";
import MediaForm from "@/components/admin/media-form";

export const metadata: Metadata = { title: "Nuevo ítem de medios · Panel" };

export default function NewMediaPage() {
  return <MediaForm />;
}
