import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AdminLogin from "@/components/admin/AdminLogin";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin login", robots: { index: false } };

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <div className="flex w-full flex-col items-center gap-6">
        <AdminLogin />
        <Link href="/" className="text-sm text-muted underline-offset-4 hover:underline">
          ← Back to site
        </Link>
      </div>
    </main>
  );
}
