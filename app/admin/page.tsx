import type { Metadata } from "next";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { requireAdmin } from "@/lib/auth";
import { getContent } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminPage() {
  await requireAdmin();
  const content = await getContent();
  return <AdminDashboard content={content} />;
}
