import { site } from "@/lib/site";
import DownloadCv from "./DownloadCv";

function AnimatedName({ text }: { text: string }) {
  let i = 0;
  return (
    <h1
      aria-label={text}
      className="font-display text-[clamp(3rem,10vw,7rem)] font-normal leading-[0.92] tracking-[-0.035em]"
    >
      {text.split(" ").map((word, w) => (
        <span key={w} aria-hidden className={`block whitespace-nowrap ${w > 0 ? "italic" : ""}`}>
          {word.split("").map((ch) => {
            const idx = i++;
            return (
              <span key={idx} className="hero-letter">
                <span style={{ "--i": idx } as React.CSSProperties}>{ch}</span>
              </span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}

/** Minimal availability note: a live dot, one line of text, and a thin rule leading to the contact link. */
function StatusNote() {
  return (
    <a
      href="#contact"
      data-cursor-label="Hi!"
      className="hero-fade group absolute right-4 top-20 hidden items-center gap-3 text-sm sm:flex md:right-8 md:top-24"
      style={{ "--d": "1200ms" } as React.CSSProperties}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="status-ping absolute inset-0 rounded-full bg-plum" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-plum" />
      </span>
      <span className="font-medium">Open to opportunities</span>
      <span aria-hidden className="h-px w-10 bg-ink/40 transition-[width] duration-300 group-hover:w-16" />
      <span className="font-display italic text-muted transition-colors group-hover:text-plum">
        Say hello <span aria-hidden>→</span>
      </span>
    </a>
  );
}

export default function Hero({ hasCv }: { hasCv: boolean }) {
  return (
    <section id="top" className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:pt-24">
      <StatusNote />
      <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)] md:items-center md:gap-12">
        <div>
          <p className="hero-fade mb-6 inline-flex items-center gap-2 brutal-border rounded-full bg-card px-3 py-1 text-sm font-semibold" style={{ "--d": "100ms" } as React.CSSProperties}>
            <span className="h-2.5 w-2.5 rounded-full bg-plum" /> Portfolio · {new Date().getFullYear()}
          </p>
          <AnimatedName text={site.name} />
        </div>

        <div className="brutal-box relative mt-2 overflow-hidden p-6 sm:p-8 md:mt-10">
          <span aria-hidden className="absolute -right-5 -top-12 font-display text-[10rem] leading-none text-sage">✳</span>
          <div className="relative">
            <p className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted">
              <span className="h-px w-7 bg-ink" /> A little about me
            </p>
            <p className="max-w-sm text-lg leading-relaxed sm:text-xl">{site.tagline}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#projects" className="brutal-btn !bg-plum text-white" data-cursor-label="Look" data-mascot="cta">
                See my work <span aria-hidden>↓</span>
              </a>
              <a href="#contact" className="brutal-btn" data-cursor-label="Say hi" data-mascot="contact">
                Get in touch
              </a>
              {hasCv && <DownloadCv />}
            </div>
          </div>
        </div>
      </div>

      <ul className="hero-fade mt-10 flex flex-wrap gap-2" style={{ "--d": "1150ms" } as React.CSSProperties}>
        {site.roles.map((role, i) => (
          <li key={role} className="brutal-border rounded-full px-3 py-1 text-sm font-semibold" style={{ background: ["var(--color-sage)", "var(--color-clay)", "var(--color-sand)"][i % 3] }}>
            {role}
          </li>
        ))}
      </ul>
    </section>
  );
}
