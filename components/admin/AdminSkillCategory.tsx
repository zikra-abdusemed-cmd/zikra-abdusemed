"use client";

import { useState } from "react";
import type { SkillCategory } from "@/lib/types";
import ConfirmButton from "./ConfirmButton";
import InlineEdit from "./InlineEdit";

export interface SkillCategoryHandlers {
  renameCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => void;
  moveCategory: (id: string, direction: -1 | 1) => void;
  addSkill: (categoryId: string, name: string) => Promise<boolean>;
  renameSkill: (categoryId: string, skillId: string, name: string) => void;
  deleteSkill: (categoryId: string, skillId: string) => void;
}

export default function AdminSkillCategory({
  category,
  isFirst,
  isLast,
  pending,
  handlers,
}: {
  category: SkillCategory;
  isFirst: boolean;
  isLast: boolean;
  pending: boolean;
  handlers: SkillCategoryHandlers;
}) {
  const [newSkill, setNewSkill] = useState("");

  return (
    <div className="brutal-box flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b-[2.5px] border-ink bg-mauve/60 px-4 py-3">
        <InlineEdit
          value={category.name}
          ariaLabel="Category name"
          onSave={(name) => handlers.renameCategory(category.id, name)}
          className="mr-auto font-display text-lg font-semibold"
          inputClassName="mr-auto max-w-[14rem]"
        />
        <div className="flex gap-1.5">
          <button
            type="button"
            aria-label="Move category up"
            disabled={isFirst || pending}
            onClick={() => handlers.moveCategory(category.id, -1)}
            className="brutal-btn !px-2.5 !py-1.5 text-xs"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Move category down"
            disabled={isLast || pending}
            onClick={() => handlers.moveCategory(category.id, 1)}
            className="brutal-btn !px-2.5 !py-1.5 text-xs"
          >
            ↓
          </button>
          <ConfirmButton disabled={pending} onConfirm={() => handlers.deleteCategory(category.id)} />
        </div>
      </div>

      <ul className="flex flex-wrap gap-2 p-4">
        {category.skills.length === 0 && <li className="text-sm text-muted">No skills yet.</li>}
        {category.skills.map((skill) => (
          <li key={skill.id} className="brutal-border flex items-center gap-1.5 rounded-lg bg-card py-1 pl-2.5 pr-1 text-sm font-semibold">
            <InlineEdit
              value={skill.name}
              ariaLabel="Skill name"
              onSave={(name) => handlers.renameSkill(category.id, skill.id, name)}
              inputClassName="!w-32 !text-sm"
            />
            <button
              type="button"
              aria-label={`Remove ${skill.name}`}
              disabled={pending}
              onClick={() => handlers.deleteSkill(category.id, skill.id)}
              className="grid h-6 w-6 place-items-center rounded-md text-base leading-none hover:bg-clay disabled:opacity-40"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      <form
        className="mt-auto flex gap-2 border-t-[2.5px] border-dashed border-ink/40 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!newSkill.trim()) return;
          if (await handlers.addSkill(category.id, newSkill)) setNewSkill("");
        }}
      >
        <input
          value={newSkill}
          onChange={(e) => setNewSkill(e.target.value)}
          placeholder="Add a skill…"
          aria-label={`New skill in ${category.name}`}
          maxLength={60}
          className="brutal-input !py-1.5 text-sm"
        />
        <button type="submit" disabled={pending || !newSkill.trim()} className="brutal-btn shrink-0 !px-3 !py-1.5 text-sm">
          Add
        </button>
      </form>
    </div>
  );
}
