"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken, safeEqual } from "@/lib/session";
import * as store from "@/lib/store";
import { deleteUpload, saveUpload } from "@/lib/uploads";
import { MAX_PROJECT_IMAGES, isProjectCategory, type ProjectImage } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

/* ------------------------------- Auth ------------------------------- */

// Simple in-memory brute-force guard: 5 failed attempts per IP per 15 minutes.
const failures = new Map<string, { count: number; until: number }>();
const WINDOW_MS = 15 * 60 * 1000;

export async function login(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return { ok: false, error: "ADMIN_PASSWORD is not configured on the server." };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const record = failures.get(ip);
  if (record && record.until > Date.now() && record.count >= 5) {
    return { ok: false, error: "Too many attempts. Try again in a few minutes." };
  }

  const password = String(formData.get("password") ?? "");
  if (!(await safeEqual(password, expected))) {
    const fresh = !record || record.until < Date.now();
    failures.set(ip, { count: fresh ? 1 : record.count + 1, until: Date.now() + WINDOW_MS });
    return { ok: false, error: "Wrong password." };
  }

  failures.delete(ip);
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

/* ----------------------------- Helpers ----------------------------- */

function text(formData: FormData, key: string, max: number): string {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

/** Only allow http(s) links so nothing like `javascript:` ends up in an href. */
function parseLink(raw: string): string | undefined | null {
  if (!raw) return undefined;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/admin");
}

async function guarded(fn: () => Promise<ActionResult | void>): Promise<ActionResult> {
  await requireAdmin();
  try {
    const result = await fn();
    refresh();
    return result ?? { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

/* ----------------------------- Projects ----------------------------- */

function readProject(formData: FormData) {
  const title = text(formData, "title", 120);
  const description = text(formData, "description", 1000);
  const category = String(formData.get("category") ?? "");
  const link = parseLink(text(formData, "link", 500));

  if (!title) return { error: "Title is required." } as const;
  if (!description) return { error: "Description is required." } as const;
  if (!isProjectCategory(category)) return { error: "Pick a valid category." } as const;
  if (link === null) return { error: "Link must be a valid http(s) URL." } as const;
  return { data: { title, description, category, link } } as const;
}

export async function saveProject(formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const parsed = readProject(formData);
    if ("error" in parsed) return { ok: false, error: parsed.error! };
    const id = text(formData, "id", 100);
    const existing = id ? await store.getProject(id) : undefined;
    if (id && !existing) return { ok: false, error: "Project not found." };

    // Photos. "imageOrder" lists the final order: "e:<name>" keeps an existing photo,
    // "n:<index>:<w>x<h>" is the index-th newly picked file (sizes measured in the browser).
    const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
    let order: string[] = [];
    try {
      order = (JSON.parse(String(formData.get("imageOrder") ?? "[]")) as unknown[]).map(String);
    } catch {
      return { ok: false, error: "Could not read the photo list. Please try again." };
    }
    if (order.length > MAX_PROJECT_IMAGES) return { ok: false, error: `A project can have up to ${MAX_PROJECT_IMAGES} photos.` };

    const old = existing?.images ?? [];
    const uploaded: string[] = [];
    const images: ProjectImage[] = [];
    try {
      for (const token of order) {
        if (token.startsWith("e:")) {
          const kept = old.find((img) => img.name === token.slice(2));
          if (kept && !images.includes(kept)) images.push(kept);
        } else if (token.startsWith("n:")) {
          const [, index, size = ""] = token.split(":");
          const file = files[Number(index)];
          if (!file) continue;
          const name = await saveUpload(file);
          uploaded.push(name);
          const [w, h] = size.split("x").map((n) => Math.round(Number(n)));
          const sane = (n: number) => Number.isFinite(n) && n > 0 && n < 20000;
          images.push(sane(w) && sane(h) ? { name, w, h } : { name });
        }
      }
      if (id) await store.updateProject(id, { ...parsed.data, images });
      else await store.createProject({ ...parsed.data, images });
    } catch (err) {
      await Promise.all(uploaded.map(deleteUpload)); // don't leave orphaned files behind
      throw err;
    }
    // remove files for photos that were taken off the project
    await Promise.all(old.filter((img) => !images.includes(img)).map((img) => deleteUpload(img.name)));
  });
}

export async function removeProject(id: string): Promise<ActionResult> {
  return guarded(async () => {
    const removed = await store.deleteProject(id);
    await Promise.all((removed?.images ?? []).map((img) => deleteUpload(img.name)));
  });
}

/* -------------------------- Skill categories -------------------------- */

export async function addSkillCategory(name: string): Promise<ActionResult> {
  return guarded(async () => {
    const clean = name.trim().slice(0, 60);
    if (!clean) return { ok: false, error: "Category name is required." };
    await store.createSkillCategory(clean);
  });
}

export async function renameSkillCategory(id: string, name: string): Promise<ActionResult> {
  return guarded(async () => {
    const clean = name.trim().slice(0, 60);
    if (!clean) return { ok: false, error: "Category name is required." };
    await store.renameSkillCategory(id, clean);
  });
}

export async function removeSkillCategory(id: string): Promise<ActionResult> {
  return guarded(() => store.deleteSkillCategory(id));
}

export async function moveSkillCategory(id: string, direction: -1 | 1): Promise<ActionResult> {
  return guarded(() => store.moveSkillCategory(id, direction === -1 ? -1 : 1));
}

/* ------------------------------- Skills ------------------------------- */

export async function addSkill(categoryId: string, name: string): Promise<ActionResult> {
  return guarded(async () => {
    const clean = name.trim().slice(0, 60);
    if (!clean) return { ok: false, error: "Skill name is required." };
    await store.addSkill(categoryId, clean);
  });
}

export async function renameSkill(categoryId: string, skillId: string, name: string): Promise<ActionResult> {
  return guarded(async () => {
    const clean = name.trim().slice(0, 60);
    if (!clean) return { ok: false, error: "Skill name is required." };
    await store.renameSkill(categoryId, skillId, clean);
  });
}

export async function removeSkill(categoryId: string, skillId: string): Promise<ActionResult> {
  return guarded(() => store.deleteSkill(categoryId, skillId));
}

/* ----------------------------- Soft skills ----------------------------- */

export async function saveSoftSkill(id: string | null, name: string, description: string): Promise<ActionResult> {
  return guarded(async () => {
    const cleanName = name.trim().slice(0, 60);
    const cleanDesc = description.trim().slice(0, 200);
    if (!cleanName) return { ok: false, error: "Soft skill name is required." };
    if (id) await store.updateSoftSkill(id, cleanName, cleanDesc || undefined);
    else await store.createSoftSkill(cleanName, cleanDesc || undefined);
  });
}

export async function removeSoftSkill(id: string): Promise<ActionResult> {
  return guarded(() => store.deleteSoftSkill(id));
}

/* ----------------------------- Activities ----------------------------- */

export async function saveActivity(formData: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const title = text(formData, "title", 120);
    const organization = text(formData, "organization", 120);
    const period = text(formData, "period", 60);
    const description = text(formData, "description", 1000);
    const link = parseLink(text(formData, "link", 500));
    if (!title) return { ok: false, error: "Title is required." };
    if (!description) return { ok: false, error: "Description is required." };
    if (link === null) return { ok: false, error: "Link must be a valid http(s) URL." };
    const input = { title, organization, period, description, link };
    const id = text(formData, "id", 100);
    if (id) await store.updateActivity(id, input);
    else await store.createActivity(input);
  });
}

export async function removeActivity(id: string): Promise<ActionResult> {
  return guarded(() => store.deleteActivity(id));
}
