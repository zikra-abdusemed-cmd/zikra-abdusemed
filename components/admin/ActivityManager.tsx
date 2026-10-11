"use client";

import { useState, useTransition } from "react";
import { removeActivity, saveActivity, type ActionResult } from "@/app/admin/actions";
import type { Activity } from "@/lib/types";
import ConfirmButton from "./ConfirmButton";

type Notify = (result: ActionResult, success: string) => void;

function ActivityForm({
  activity,
  pending,
  onSubmit,
  onCancel,
}: {
  activity: Activity | null;
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
      <h2 className="font-display text-xl font-semibold">{activity ? "Edit activity" : "New activity"}</h2>
      {activity && <input type="hidden" name="id" value={activity.id} />}
      <label className="grid gap-1.5 text-sm font-bold">
        Title / role
        <input name="title" required maxLength={120} defaultValue={activity?.title} placeholder="e.g. CTF team member" className="brutal-input font-normal" />
      </label>
      <label className="grid gap-1.5 text-sm font-bold">
        Organization
        <input name="organization" maxLength={120} defaultValue={activity?.organization} placeholder="e.g. University cybersecurity club" className="brutal-input font-normal" />
      </label>
      <label className="grid gap-1.5 text-sm font-bold">
        When
        <input name="period" maxLength={60} defaultValue={activity?.period} placeholder="e.g. 2024 – Present" className="brutal-input font-normal" />
      </label>
      <label className="grid gap-1.5 text-sm font-bold">
        Description
        <textarea name="description" required rows={4} maxLength={1000} defaultValue={activity?.description} className="brutal-input resize-y font-normal" />
      </label>
      <label className="grid gap-1.5 text-sm font-bold">
        <span>
          Link <span className="font-normal text-muted">(optional)</span>
        </span>
        <input name="link" type="text" inputMode="url" placeholder="https://…" maxLength={500} defaultValue={activity?.link} className="brutal-input font-normal" />
      </label>
      <div className="flex flex-wrap gap-3 pt-1">
        <button type="submit" disabled={pending} className="brutal-btn !bg-plum text-white">
          {pending ? "Saving…" : activity ? "Save changes" : "Add activity"}
        </button>
        {activity && (
          <button type="button" onClick={onCancel} className="brutal-btn">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default function ActivityManager({ activities, notify }: { activities: Activity[]; notify: Notify }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editing = activities.find((a) => a.id === editingId) ?? null;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,380px)_1fr]">
      <div className="lg:sticky lg:top-6">
        <ActivityForm
          key={editingId ?? "new"}
          activity={editing}
          pending={pending}
          onCancel={() => setEditingId(null)}
          onSubmit={(data, form) =>
            startTransition(async () => {
              const result = await saveActivity(data);
              notify(result, editing ? "Activity updated." : "Activity added.");
              if (result.ok) {
                setEditingId(null);
                form.reset();
              }
            })
          }
        />
      </div>

      {activities.length === 0 ? (
        <p className="brutal-box !border-dashed !shadow-none p-6 text-muted">No activities yet.</p>
      ) : (
        <ul className="grid gap-3">
          {activities.map((a) => (
            <li
              key={a.id}
              className={`brutal-box flex flex-col gap-3 p-4 sm:flex-row sm:items-start ${editingId === a.id ? "!bg-mauve/60" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold">{a.title}</p>
                <p className="text-sm text-muted">
                  {[a.organization, a.period].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{a.description}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => setEditingId(a.id)} className="brutal-btn !px-3 !py-1.5 text-xs">
                  Edit
                </button>
                <ConfirmButton
                  disabled={pending}
                  onConfirm={() =>
                    startTransition(async () => {
                      const result = await removeActivity(a.id);
                      notify(result, "Activity deleted.");
                      if (result.ok && editingId === a.id) setEditingId(null);
                    })
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
