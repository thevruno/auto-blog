import type { Metadata } from "next";
import PostForm from "@/components/admin/post-form";

export const metadata: Metadata = { title: "Nueva nota · Panel" };

export default function NewPostPage() {
  return <PostForm />;
}
