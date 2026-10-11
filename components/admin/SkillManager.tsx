"use client";

import { useState, useTransition } from "react";
import * as actions from "@/app/admin/actions";
import type { ActionResult } from "@/app/admin/actions";
import type { SkillCategory } from "@/lib/types";
import AdminSkillCategory, { type SkillCategoryHandlers } from "./AdminSkillCategory";

export default function SkillManager({
  categories,
  notify,
}: {
  categories: SkillCategory[];
  notify: (result: ActionResult, success: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [newCategory, setNewCategory] = useState("");

  const run = (fn: () => Promise<ActionResult>, success: string) =>
    new Promise<boolean>((resolve) => {
      startTransition(async () => {
        const result = await fn();
        notify(result, success);
        resolve(result.ok);
      });
    });

  const handlers: SkillCategoryHandlers = {
    renameCategory: (id, name) => void run(() => actions.renameSkillCategory(id, name), "Category renamed."),
    deleteCategory: (id) => void run(() => actions.removeSkillCategory(id), "Category deleted."),
    moveCategory: (id, dir) => void run(() => actions.moveSkillCategory(id, dir), "Order updated."),
    addSkill: (categoryId, name) => run(() => actions.addSkill(categoryId, name), "Skill added."),
    renameSkill: (categoryId, skillId, name) =>
      void run(() => actions.renameSkill(categoryId, skillId, name), "Skill renamed."),
    deleteSkill: (categoryId, skillId) => void run(() => actions.removeSkill(categoryId, skillId), "Skill removed."),
  };

  return (
    <div className="grid gap-8">
      <form
        className="brutal-box flex flex-col gap-3 p-5 sm:flex-row sm:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!newCategory.trim()) return;
          if (await run(() => actions.addSkillCategory(newCategory), "Category added.")) setNewCategory("");
        }}
      >
        <label className="grid flex-1 gap-1.5 text-sm font-bold">
          New skill category
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="e.g. Frameworks, Cloud, Soft skills"
            maxLength={60}
            className="brutal-input font-normal"
          />
        </label>
        <button type="submit" disabled={pending || !newCategory.trim()} className="brutal-btn !bg-plum text-white">
          Add category
        </button>
      </form>

      {categories.length === 0 ? (
        <p className="brutal-box !border-dashed !shadow-none p-6 text-muted">No skill categories yet. Add one above.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {categories.map((cat, i) => (
            <AdminSkillCategory
              key={cat.id}
              category={cat}
              isFirst={i === 0}
              isLast={i === categories.length - 1}
              pending={pending}
              handlers={handlers}
            />
          ))}
        </div>
      )}
    </div>
  );
}
