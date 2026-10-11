"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { PROJECT_CATEGORIES, type Project, type ProjectCategoryId } from "@/lib/types";
import ProjectCard from "./ProjectCard";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";

export default function Projects({ projects }: { projects: Project[] }) {
  const [active, setActive] = useState<ProjectCategoryId>(PROJECT_CATEGORIES[0].id);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const visible = projects.filter((p) => p.category === active);

  // Arrow-key navigation between tabs (WAI-ARIA tabs pattern)
  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + PROJECT_CATEGORIES.length) % PROJECT_CATEGORIES.length;
    setActive(PROJECT_CATEGORIES[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <section id="projects" className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
      <SectionHeading index="04" title="Projects" kicker="Three disciplines, one habit: making things that work." />

      <Reveal variant="wipe">
        <div role="tablist" aria-label="Project categories" className="mb-10 flex flex-wrap gap-3">
          {PROJECT_CATEGORIES.map((cat, i) => {
            const selected = cat.id === active;
            const count = projects.filter((p) => p.category === cat.id).length;
            return (
              <button
                key={cat.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                role="tab"
                data-mascot="tab"
                id={`tab-${cat.id}`}
                aria-selected={selected}
                aria-controls="projects-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(cat.id)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={`brutal-btn ${selected ? "-translate-y-0.5 !shadow-brutal" : "!bg-card/70"}`}
                style={selected ? { background: cat.accent } : undefined}
              >
                {cat.label}
                <span className="rounded-full bg-ink px-2 py-0.5 text-xs text-paper">{count}</span>
              </button>
            );
          })}
        </div>
      </Reveal>

      <div id="projects-panel" role="tabpanel" aria-labelledby={`tab-${active}`}>
        {visible.length > 0 ? (
          <div key={active} className="gap-6 sm:columns-2 lg:columns-3">
            {/* masonry: cards keep their own height and pack into columns without gaps */}
            {visible.map((project, i) => (
              <Reveal key={project.id} variant="rise" delay={(i % 3) * 90} className="mb-6 break-inside-avoid">
                <ProjectCard project={project} index={i} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="brutal-box !border-dashed p-10 text-center text-muted">
            Nothing here yet. New projects are on the way.
          </div>
        )}
      </div>
    </section>
  );
}
