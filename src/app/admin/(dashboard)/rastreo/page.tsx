import type { Metadata } from "next";
import DiscoveryPanel from "@/components/admin/discovery-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Rastreo web · Panel" };

export default function DiscoveryPage() {
  return <DiscoveryPanel />;
}
