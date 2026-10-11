import type { SkillCategory as SkillCategoryType } from "@/lib/types";
import SectionHeading from "./SectionHeading";
import SkillCategory from "./SkillCategory";

export default function Skills({ categories }: { categories: SkillCategoryType[] }) {
  return (
    <section id="skills" className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
      <SectionHeading index="02" title="Skills" kicker="The toolbox, sorted into drawers." />
      {categories.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat, i) => (
            <SkillCategory key={cat.id} category={cat} index={i} />
          ))}
        </div>
      ) : (
        <p className="brutal-box p-6 text-muted">No skills added yet.</p>
      )}
    </section>
  );
}
