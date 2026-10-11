"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { logout, type ActionResult } from "@/app/admin/actions";
import type { SiteContent } from "@/lib/types";
import ProjectManager from "./ProjectManager";
import ActivityManager from "./ActivityManager";
import SkillManager from "./SkillManager";
import SoftSkillManager from "./SoftSkillManager";

type Tab = "projects" | "skills" | "soft" | "activities";
type Toast = { kind: "ok" | "error"; message: string; id: number } | null;

export default function AdminDashboard({ content }: { content: SiteContent }) {
  const [tab, setTab] = useState<Tab>("projects");
  const [toast, setToast] = useState<Toast>(null);

  const notify = useCallback((result: ActionResult, success: string) => {
    setToast(
      result.ok
        ? { kind: "ok", message: `${success} Live on the site.`, id: Date.now() }
        : { kind: "error", message: result.error, id: Date.now() },
    );
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "projects", label: "Projects", count: content.projects.length },
    { id: "skills", label: "Skills", count: content.skillCategories.length },
    { id: "soft", label: "Soft skills", count: content.softSkills.length },
    { id: "activities", label: "Activities", count: content.activities.length },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted">Admin panel</p>
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">Content</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/" target="_blank" className="brutal-btn text-sm">
            View site ↗
          </Link>
          <form action={logout}>
            <button type="submit" className="brutal-btn !bg-ink text-sm text-paper">
              Log out
            </button>
          </form>
        </div>
      </header>

      <div role="tablist" aria-label="Content type" className="mb-8 flex flex-wrap gap-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`brutal-btn ${tab === t.id ? "!bg-sage !shadow-brutal" : ""}`}
          >
            {t.label}
            <span className="rounded-full bg-ink px-2 py-0.5 text-xs text-paper">{t.count}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === "projects" && <ProjectManager projects={content.projects} notify={notify} />}
        {tab === "skills" && <SkillManager categories={content.skillCategories} notify={notify} />}
        {tab === "soft" && <SoftSkillManager skills={content.softSkills} notify={notify} />}
        {tab === "activities" && <ActivityManager activities={content.activities} notify={notify} />}
      </div>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
        {toast && (
          <p
            key={toast.id}
            role={toast.kind === "error" ? "alert" : "status"}
            className={`brutal-box pointer-events-auto px-4 py-2.5 text-sm font-semibold ${
              toast.kind === "ok" ? "!bg-sage" : "!bg-clay"
            }`}
          >
            {toast.message}
          </p>
        )}
      </div>
    </div>
  );
}
