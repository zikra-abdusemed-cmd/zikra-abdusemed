import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Activity, Project, ProjectCategoryId, ProjectImage, SiteContent, SkillCategory, SoftSkill } from "./types";
import { hasBlobStorage, readBlob, writeBlob } from "./blob-storage";

/**
 * JSON-file content store.
 * - data/content.json holds live content; when it doesn't exist, data/seed.json is read directly.
 *   Reading the seed directly keeps the public site compatible with read-only serverless filesystems.
 * - Writes are serialized through a promise queue and written atomically (tmp file + rename)
 *   so concurrent admin edits can't interleave or leave a half-written file.
 */
const DATA_DIR = process.env.CONTENT_DIR ?? path.join(process.cwd(), "data");
const CONTENT_FILE = path.join(DATA_DIR, "content.json");
const SEED_FILE = path.join(process.cwd(), "data", "seed.json");

async function readContentFile(): Promise<Partial<SiteContent>> {
  if (process.env.VERCEL && hasBlobStorage()) {
    const data = await readBlob("portfolio/content.json");
    if (data) return JSON.parse(new TextDecoder().decode(data)) as Partial<SiteContent>;
    return JSON.parse(await readFile(SEED_FILE, "utf8")) as Partial<SiteContent>;
  }
  if (process.env.VERCEL) {
    return JSON.parse(await readFile(SEED_FILE, "utf8")) as Partial<SiteContent>;
  }
  try {
    return JSON.parse(await readFile(CONTENT_FILE, "utf8")) as Partial<SiteContent>;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    return JSON.parse(await readFile(SEED_FILE, "utf8")) as Partial<SiteContent>;
  }
}

/** Older content stored a single `image` file name; fold it into the `images` list. */
function normalizeProject(raw: Project & { image?: string }): Project {
  const { image, ...project } = raw;
  if (image && !project.images?.length) project.images = [{ name: image }];
  return project;
}

export async function getContent(): Promise<SiteContent> {
  const parsed = await readContentFile();
  // Sections added after the content file was created fall back to the sample data until first edited.
  let seed: Partial<SiteContent> | null = null;
  const fallback = async <K extends keyof SiteContent>(key: K): Promise<SiteContent[K]> => {
    if (parsed[key]) return parsed[key] as SiteContent[K];
    seed ??= JSON.parse(await readFile(SEED_FILE, "utf8")) as Partial<SiteContent>;
    return (seed[key] ?? []) as SiteContent[K];
  };
  return {
    projects: (parsed.projects ?? []).map(normalizeProject),
    skillCategories: parsed.skillCategories ?? [],
    softSkills: await fallback("softSkills"),
    activities: await fallback("activities"),
  };
}

let writeQueue: Promise<unknown> = Promise.resolve();

function mutate<T>(fn: (content: SiteContent) => T): Promise<T> {
  const run = async () => {
    if (process.env.VERCEL && !hasBlobStorage()) {
      throw new Error("Admin editing is not connected yet. In Vercel, create and connect a public Blob store, then redeploy.");
    }
    const content = await getContent();
    const result = fn(content);
    if (process.env.VERCEL) {
      await writeBlob("portfolio/content.json", JSON.stringify(content, null, 2), "application/json", true);
      return result;
    }
    const tmp = `${CONTENT_FILE}.${process.pid}.${Date.now()}.tmp`;
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(tmp, JSON.stringify(content, null, 2), "utf8");
    await rename(tmp, CONTENT_FILE);
    return result;
  };
  const next = writeQueue.then(run, run);
  writeQueue = next.catch(() => undefined);
  return next;
}

class NotFoundError extends Error {}

function findOrThrow<T extends { id: string }>(list: T[], id: string, what: string): T {
  const item = list.find((x) => x.id === id);
  if (!item) throw new NotFoundError(`${what} not found`);
  return item;
}

/* ----------------------------- Projects ----------------------------- */

export interface ProjectInput {
  title: string;
  description: string;
  link?: string;
  images?: ProjectImage[];
  category: ProjectCategoryId;
}

export function createProject(input: ProjectInput) {
  return mutate((c) => {
    const project: Project = { id: randomUUID(), createdAt: new Date().toISOString(), ...input };
    if (!project.link) delete project.link;
    if (!project.images?.length) delete project.images;
    c.projects.push(project);
    return project;
  });
}

export function updateProject(id: string, input: ProjectInput) {
  return mutate((c) => {
    const project = findOrThrow(c.projects, id, "Project");
    project.title = input.title;
    project.description = input.description;
    project.category = input.category;
    if (input.link) project.link = input.link;
    else delete project.link;
    if (input.images?.length) project.images = input.images;
    else delete project.images;
    return project;
  });
}

/** Returns the removed project (so its photo can be cleaned up). */
export function deleteProject(id: string) {
  return mutate((c) => {
    const removed = c.projects.find((p) => p.id === id);
    c.projects = c.projects.filter((p) => p.id !== id);
    return removed;
  });
}

export async function getProject(id: string) {
  return (await getContent()).projects.find((p) => p.id === id);
}

/* -------------------------- Skill categories -------------------------- */

export function createSkillCategory(name: string) {
  return mutate((c) => {
    const category: SkillCategory = { id: randomUUID(), name, skills: [] };
    c.skillCategories.push(category);
    return category;
  });
}

export function renameSkillCategory(id: string, name: string) {
  return mutate((c) => {
    findOrThrow(c.skillCategories, id, "Category").name = name;
  });
}

export function deleteSkillCategory(id: string) {
  return mutate((c) => {
    c.skillCategories = c.skillCategories.filter((cat) => cat.id !== id);
  });
}

export function moveSkillCategory(id: string, direction: -1 | 1) {
  return mutate((c) => {
    const i = c.skillCategories.findIndex((cat) => cat.id === id);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= c.skillCategories.length) return;
    const list = c.skillCategories;
    [list[i], list[j]] = [list[j], list[i]];
  });
}

/* ------------------------------- Skills ------------------------------- */

export function addSkill(categoryId: string, name: string) {
  return mutate((c) => {
    const category = findOrThrow(c.skillCategories, categoryId, "Category");
    const skill = { id: randomUUID(), name };
    category.skills.push(skill);
    return skill;
  });
}

export function renameSkill(categoryId: string, skillId: string, name: string) {
  return mutate((c) => {
    const category = findOrThrow(c.skillCategories, categoryId, "Category");
    findOrThrow(category.skills, skillId, "Skill").name = name;
  });
}

export function deleteSkill(categoryId: string, skillId: string) {
  return mutate((c) => {
    const category = findOrThrow(c.skillCategories, categoryId, "Category");
    category.skills = category.skills.filter((s) => s.id !== skillId);
  });
}

/* ----------------------------- Soft skills ----------------------------- */

export function createSoftSkill(name: string, description?: string) {
  return mutate((c) => {
    const skill: SoftSkill = { id: randomUUID(), name, ...(description ? { description } : {}) };
    c.softSkills.push(skill);
    return skill;
  });
}

export function updateSoftSkill(id: string, name: string, description?: string) {
  return mutate((c) => {
    const skill = findOrThrow(c.softSkills, id, "Soft skill");
    skill.name = name;
    if (description) skill.description = description;
    else delete skill.description;
  });
}

export function deleteSoftSkill(id: string) {
  return mutate((c) => {
    c.softSkills = c.softSkills.filter((s) => s.id !== id);
  });
}

/* ----------------------------- Activities ----------------------------- */

export type ActivityInput = Omit<Activity, "id">;

export function createActivity(input: ActivityInput) {
  return mutate((c) => {
    const activity: Activity = { id: randomUUID(), ...input };
    if (!activity.link) delete activity.link;
    c.activities.push(activity);
    return activity;
  });
}

export function updateActivity(id: string, input: ActivityInput) {
  return mutate((c) => {
    const activity = findOrThrow(c.activities, id, "Activity");
    Object.assign(activity, input);
    if (!input.link) delete activity.link;
  });
}

export function deleteActivity(id: string) {
  return mutate((c) => {
    c.activities = c.activities.filter((a) => a.id !== id);
  });
}
