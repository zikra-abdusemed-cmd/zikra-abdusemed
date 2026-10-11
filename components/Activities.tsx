import type { Activity } from "@/lib/types";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";

export default function Activities({ activities }: { activities: Activity[] }) {
  return (
    <section id="activities" className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
      <SectionHeading index="05" title="Extracurricular" kicker="Clubs, volunteering, and everything outside class." />
      {activities.length > 0 ? (
        <ol className="relative grid gap-6 border-l-[2.5px] border-dashed border-ink/50 pl-6 sm:pl-10">
          {activities.map((a, i) => (
            <Reveal as="li" key={a.id} variant="wipe" delay={(i % 3) * 90} className="relative">
              {/* timeline dot */}
              <span
                aria-hidden
                className="brutal-border absolute -left-[2.15rem] top-6 h-5 w-5 rounded-full sm:-left-[3.15rem]"
                style={{ background: ["var(--color-sage)", "var(--color-clay)", "var(--color-sand)"][i % 3] }}
              />
              <article data-mascot="activity" data-mascot-name={a.title} className="brutal-box p-6 sm:p-7">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  {a.period && (
                    <span className="brutal-border rounded-full bg-mauve/70 px-3 py-0.5 text-xs font-bold uppercase tracking-wide">
                      {a.period}
                    </span>
                  )}
                  {a.organization && <span className="font-display italic text-muted">{a.organization}</span>}
                </div>
                <h3 className="mt-3 font-display text-2xl leading-tight sm:text-3xl">{a.title}</h3>
                <p className="mt-2 max-w-3xl leading-relaxed text-muted">{a.description}</p>
                {a.link && (
                  <a
                    href={a.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="brutal-btn mt-5 text-sm"
                    data-cursor-label="Open"
                  >
                    Learn more <span aria-hidden>↗</span>
                  </a>
                )}
              </article>
            </Reveal>
          ))}
        </ol>
      ) : (
        <p className="brutal-box p-6 text-muted">No activities added yet.</p>
      )}
    </section>
  );
}
