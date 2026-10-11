"use client";

import { useState, useTransition } from "react";
import { removeProject, saveProject, type ActionResult } from "@/app/admin/actions";
import { PROJECT_CATEGORIES, type Project } from "@/lib/types";
import ConfirmButton from "./ConfirmButton";
import ProjectForm from "./ProjectForm";

export default function ProjectManager({
  projects,
  notify,
}: {
  projects: Project[];
  notify: (result: ActionResult, success: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [formVersion, setFormVersion] = useState(0); // bump to remount (fully reset) the form
  const editing = projects.find((p) => p.id === editingId) ?? null;

  const submit = (data: FormData, form: HTMLFormElement) => {
    startTransition(async () => {
      const result = await saveProject(data);
      notify(result, editing ? "Project updated." : "Project added.");
      if (result.ok) {
        setEditingId(null);
        form.reset();
        setFormVersion((v) => v + 1);
      }
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      const result = await removeProject(id);
      notify(result, "Project deleted.");
      if (result.ok && editingId === id) setEditingId(null);
    });
  };

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,380px)_1fr]">
      <div className="lg:sticky lg:top-6">
        <ProjectForm
          key={`${editingId ?? "new"}-${formVersion}`}
          project={editing}
          pending={pending}
          onSubmit={submit}
          onCancel={() => setEditingId(null)}
        />
      </div>

      <div className="grid gap-8">
        {PROJECT_CATEGORIES.map((cat) => {
          const list = projects.filter((p) => p.category === cat.id);
          return (
            <section key={cat.id}>
              <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
                <span className="brutal-border h-4 w-4 rounded-full" style={{ background: cat.accent }} />
                {cat.label}
                <span className="text-sm font-normal text-muted">({list.length})</span>
              </h3>
              {list.length === 0 ? (
                <p className="brutal-box !border-dashed !shadow-none p-4 text-sm text-muted">No projects yet.</p>
              ) : (
                <ul className="grid gap-3">
                  {list.map((p) => (
                    <li
                      key={p.id}
                      className={`brutal-box flex flex-col gap-3 p-4 sm:flex-row sm:items-start ${editingId === p.id ? "!bg-sage/40" : ""}`}
                    >
                      {p.images?.length ? (
                        <div className="relative shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/uploads/${p.images[0].name}`} alt="" className="brutal-border h-16 w-24 rounded-lg bg-mauve/40 object-contain" />
                          {p.images.length > 1 && (
                            <span className="absolute -right-1.5 -top-1.5 rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-bold text-white">
                              {p.images.length}
                            </span>
                          )}
                        </div>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">{p.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted">{p.description}</p>
                        <p className="mt-1 truncate text-xs">
                          {p.link ? (
                            <a href={p.link} target="_blank" rel="noopener noreferrer" className="underline">
                              {p.link}
                            </a>
                          ) : (
                            <span className="text-muted">No link</span>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(p.id)}
                          className="brutal-btn !px-3 !py-1.5 text-xs"
                        >
                          Edit
                        </button>
                        <ConfirmButton disabled={pending} onConfirm={() => remove(p.id)} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
