"use client";

import { useState, useTransition } from "react";
import { removeSoftSkill, saveSoftSkill, type ActionResult } from "@/app/admin/actions";
import type { SoftSkill } from "@/lib/types";
import ConfirmButton from "./ConfirmButton";

type Notify = (result: ActionResult, success: string) => void;

function SoftSkillFields({
  initial,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: SoftSkill;
  pending: boolean;
  submitLabel: string;
  onSubmit: (name: string, description: string) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  return (
    <form
      className="grid gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await onSubmit(name, description)) {
          if (!initial) {
            setName("");
            setDescription("");
          }
        }
      }}
    >
      <label className="grid gap-1.5 text-sm font-bold">
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} className="brutal-input font-normal" />
      </label>
      <label className="grid gap-1.5 text-sm font-bold">
        <span>
          Short description <span className="font-normal text-muted">(optional)</span>
        </span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
          placeholder="One line about how you use it"
          className="brutal-input font-normal"
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending || !name.trim()} className="brutal-btn !bg-plum text-sm text-white">
          {pending ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="brutal-btn text-sm">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default function SoftSkillManager({ skills, notify }: { skills: SoftSkill[]; notify: Notify }) {
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);

  const run = (fn: () => Promise<ActionResult>, success: string) =>
    new Promise<boolean>((resolve) =>
      startTransition(async () => {
        const result = await fn();
        notify(result, success);
        resolve(result.ok);
      }),
    );

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,380px)_1fr]">
      <div className="brutal-box p-6 lg:sticky lg:top-6">
        <h2 className="mb-4 font-display text-xl font-semibold">New soft skill</h2>
        <SoftSkillFields
          pending={pending}
          submitLabel="Add soft skill"
          onSubmit={(name, description) => run(() => saveSoftSkill(null, name, description), "Soft skill added.")}
        />
      </div>

      {skills.length === 0 ? (
        <p className="brutal-box !border-dashed !shadow-none p-6 text-muted">No soft skills yet. Add one on the left.</p>
      ) : (
        <ul className="grid gap-3">
          {skills.map((skill) => (
            <li key={skill.id} className="brutal-box p-4">
              {editingId === skill.id ? (
                <SoftSkillFields
                  initial={skill}
                  pending={pending}
                  submitLabel="Save changes"
                  onCancel={() => setEditingId(null)}
                  onSubmit={async (name, description) => {
                    const ok = await run(() => saveSoftSkill(skill.id, name, description), "Soft skill updated.");
                    if (ok) setEditingId(null);
                    return ok;
                  }}
                />
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{skill.name}</p>
                    <p className="mt-0.5 text-sm text-muted">{skill.description || "No description"}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => setEditingId(skill.id)} className="brutal-btn !px-3 !py-1.5 text-xs">
                      Edit
                    </button>
                    <ConfirmButton disabled={pending} onConfirm={() => run(() => removeSoftSkill(skill.id), "Soft skill deleted.")} />
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
