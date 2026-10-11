import { site } from "@/lib/site";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";

export default function About() {
  return (
    <section id="about" className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
      <SectionHeading index="01" title="About" />
      <div className="grid gap-6 md:grid-cols-[1.6fr_1fr]">
        <Reveal variant="rise" className="brutal-box p-6 text-lg leading-relaxed sm:p-10 sm:text-xl">
          <div data-mascot="about">
          {site.about.map((p, i) => (
            <p key={i} className={i > 0 ? "mt-5 text-muted" : ""}>
              {p}
            </p>
          ))}
          </div>
        </Reveal>
        <Reveal variant="wipe" delay={150} as="dl" className="brutal-box grid content-start gap-0 overflow-hidden !bg-mauve/70">
          {site.facts.map((f, i) => (
            <div key={f.label} className={`px-6 py-5 ${i > 0 ? "border-t-[2.5px] border-ink" : ""}`}>
              <dt className="text-xs font-bold uppercase tracking-widest text-muted">{f.label}</dt>
              <dd className="mt-1 font-display text-xl font-semibold">{f.value}</dd>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
