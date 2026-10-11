import type { Project } from "@/lib/types";
import { PROJECT_CATEGORIES } from "@/lib/types";
import ProjectGallery from "./ProjectGallery";

export default function ProjectCard({ project, index }: { project: Project; index: number }) {
  const category = PROJECT_CATEGORIES.find((c) => c.id === project.category) ?? PROJECT_CATEGORIES[0];

  return (
    <article
      className="project-card brutal-box relative flex h-full flex-col p-6"
      data-mascot="project"
      data-mascot-name={project.title}
      style={{ "--accent": category.accent } as React.CSSProperties}
    >
      {project.images?.length ? <ProjectGallery images={project.images} title={project.title} /> : null}
      <div className="mb-5 flex items-center justify-between gap-3">
        <span
          className="brutal-border rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide"
          style={{ background: category.accent }}
        >
          {category.short}
        </span>
        <span className="font-display text-sm font-semibold text-muted">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <h3 className="font-display text-2xl font-semibold leading-tight">{project.title}</h3>
      <p className="mt-3 flex-1 leading-relaxed text-muted">{project.description}</p>

      <div className="mt-6">
        {project.link ? (
          <a
            href={project.link}
            target="_blank"
            rel="noopener noreferrer"
            className="brutal-btn text-sm"
            data-cursor-label="Open"
          >
            View project
            <span aria-hidden className="card-arrow inline-block">↗</span>
          </a>
        ) : (
          <span aria-disabled="true" className="brutal-btn !border-dashed text-sm !shadow-none">
            Link coming soon
          </span>
        )}
      </div>
    </article>
  );
}
