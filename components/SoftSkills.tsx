import type { SoftSkill } from "@/lib/types";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";

const ACCENTS = ["var(--color-sage)", "var(--color-clay)", "var(--color-sand)", "var(--color-mauve)"];

export default function SoftSkills({ skills }: { skills: SoftSkill[] }) {
  return (
    <section id="soft-skills" className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
      <SectionHeading index="03" title="Soft Skills" kicker="The things that don't fit in a package.json." />
      {skills.length > 0 ? (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill, i) => (
            <Reveal as="li" key={skill.id} variant={i % 2 ? "shutter" : "rise"} delay={(i % 3) * 90}>
              <div
                data-mascot="softskill"
                data-mascot-name={skill.name}
                className="soft-tile brutal-box flex h-full items-start gap-4 p-5"
                style={{ "--tilt": `${i % 2 ? 1.2 : -1.2}deg` } as React.CSSProperties}
              >
                <span
                  aria-hidden
                  className="brutal-border mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-sm"
                  style={{ background: ACCENTS[i % ACCENTS.length] }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display text-2xl leading-tight">{skill.name}</h3>
                  {skill.description && <p className="mt-1.5 leading-relaxed text-muted">{skill.description}</p>}
                </div>
              </div>
            </Reveal>
          ))}
        </ul>
      ) : (
        <p className="brutal-box p-6 text-muted">No soft skills added yet.</p>
      )}
    </section>
  );
}
