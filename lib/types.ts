export const PROJECT_CATEGORIES = [
  { id: "software", label: "Software Development", short: "Software", accent: "var(--color-sage)" },
  { id: "design", label: "Design", short: "Design", accent: "var(--color-clay)" },
  { id: "security", label: "Cybersecurity & IT", short: "Security & IT", accent: "var(--color-sand)" },
] as const;

export type ProjectCategoryId = (typeof PROJECT_CATEGORIES)[number]["id"];

export function isProjectCategory(value: unknown): value is ProjectCategoryId {
  return PROJECT_CATEGORIES.some((c) => c.id === value);
}

export const MAX_PROJECT_IMAGES = 8;

export interface ProjectImage {
  name: string;
  /** natural size in px (lets cards reserve the right height before the photo loads) */
  w?: number;
  h?: number;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  link?: string;
  /** uploaded photos in display order, served from /uploads/<name> */
  images?: ProjectImage[];
  category: ProjectCategoryId;
  createdAt: string;
}

export interface Skill {
  id: string;
  name: string;
}

export interface SkillCategory {
  id: string;
  name: string;
  skills: Skill[];
}

export interface SoftSkill {
  id: string;
  name: string;
  description?: string;
}

export interface Activity {
  id: string;
  title: string;
  organization: string;
  period: string;
  description: string;
  link?: string;
}

export interface SiteContent {
  projects: Project[];
  skillCategories: SkillCategory[];
  softSkills: SoftSkill[];
  activities: Activity[];
}
