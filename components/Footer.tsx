import Link from "next/link";
import { site } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 pb-10 pt-4 text-sm text-muted">
      <p>
        © {new Date().getFullYear()} {site.name}
      </p>
      <Link href="/admin" className="underline-offset-4 hover:underline">
        Admin
      </Link>
    </footer>
  );
}
