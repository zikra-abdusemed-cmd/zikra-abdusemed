"use client";

import { PROJECT_CATEGORIES, type Project } from "@/lib/types";
import PhotosField from "./PhotosField";

/** Create/edit form. Remounted (via `key`) whenever the project being edited changes. */
export default function ProjectForm({
  project,
  pending,
  onSubmit,
  onCancel,
}: {
  project: Project | null;
  pending: boolean;
  onSubmit: (data: FormData, form: HTMLFormElement) => void;
  onCancel: () => void;
}) {

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget), e.currentTarget);
      }}
      className="brutal-box grid gap-4 p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold">{project ? "Edit project" : "New project"}</h2>
        {project && (
          <span className="brutal-border rounded-full bg-sage px-2.5 py-0.5 text-xs font-bold">Editing</span>
        )}
      </div>
      {project && <input type="hidden" name="id" value={project.id} />}

      <label className="grid gap-1.5 text-sm font-bold">
        Title
        <input name="title" required maxLength={120} defaultValue={project?.title} className="brutal-input font-normal" />
      </label>

      <label className="grid gap-1.5 text-sm font-bold">
        Description
        <textarea
          name="description"
          required
          rows={4}
          maxLength={1000}
          defaultValue={project?.description}
          className="brutal-input resize-y font-normal"
        />
      </label>

      <label className="grid gap-1.5 text-sm font-bold">
        Category
        <select name="category" defaultValue={project?.category ?? "software"} className="brutal-input font-normal">
          {PROJECT_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1.5 text-sm font-bold">
        <span>
          Link <span className="font-normal text-muted">(optional)</span>
        </span>
        <input
          name="link"
          type="text"
          inputMode="url"
          placeholder="https://…"
          maxLength={500}
          defaultValue={project?.link}
          className="brutal-input font-normal"
        />
      </label>

      <PhotosField current={project?.images} />

      <div className="flex flex-wrap gap-3 pt-1">
        <button type="submit" disabled={pending} className="brutal-btn !bg-plum text-white">
          {pending ? "Saving…" : project ? "Save changes" : "Add project"}
        </button>
        {project && (
          <button type="button" onClick={onCancel} className="brutal-btn">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
