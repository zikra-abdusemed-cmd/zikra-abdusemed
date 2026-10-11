import type { SkillCategory as SkillCategoryType } from "@/lib/types";
import Reveal from "./Reveal";

const ACCENTS = ["var(--color-sage)", "var(--color-clay)", "var(--color-sand)", "var(--color-mauve)"];

export default function SkillCategory({ category, index }: { category: SkillCategoryType; index: number }) {
  const accent = ACCENTS[index % ACCENTS.length];
  return (
    <Reveal variant={index % 2 ? "shutter" : "rise"} delay={(index % 3) * 110} className="brutal-box flex flex-col overflow-hidden">
      <div data-mascot="skill" data-mascot-name={category.name} className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b-[2.5px] border-ink px-5 py-4" style={{ background: accent }}>
        <h3 className="font-display text-xl font-semibold">{category.name}</h3>
        <span className="brutal-border grid h-8 min-w-8 place-items-center rounded-full bg-card px-2 text-sm font-bold">
          {category.skills.length}
        </span>
      </div>
      {category.skills.length > 0 ? (
        <ul className="flex flex-wrap gap-2 p-5">
          {category.skills.map((skill) => (
            <li
              key={skill.id}
              className="brutal-border rounded-lg bg-card px-3 py-1.5 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5 hover:-rotate-2"
            >
              {skill.name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-5 text-sm text-muted">Skills coming soon.</p>
      )}
      </div>
    </Reveal>
  );
}
