import { site } from "@/lib/site";
import CopyEmail from "./CopyEmail";
import DownloadCv from "./DownloadCv";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";

export default function Contact({ hasCv }: { hasCv: boolean }) {
  return (
    <section id="contact" className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
      <SectionHeading index="06" title="Contact" />
      <Reveal variant="shutter" className="brutal-box relative overflow-hidden !bg-plum p-8 text-white sm:p-14">
        <div data-mascot="contact">
        <span aria-hidden className="spin-slow pointer-events-none absolute -right-10 -top-10 font-display text-[12rem] leading-none text-white/15">
          ✺
        </span>
        <p className="font-display text-3xl font-semibold leading-tight sm:text-5xl">
          Have a project, role, or idea?
          <br />
          <span className="italic text-sand">Let&apos;s talk.</span>
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3 text-ink">
          <a href={`mailto:${site.email}`} className="brutal-btn !bg-sage" data-cursor-label="Write">
            {site.email}
          </a>
          <CopyEmail email={site.email} />
          {hasCv && <DownloadCv className="!bg-sand" />}
        </div>
        <ul className="mt-10 flex flex-wrap gap-3">
          {site.socials.map((s) => (
            <li key={s.label}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="brutal-btn text-sm text-ink"
                data-cursor-label="Visit"
              >
                {s.label} <span aria-hidden>↗</span>
              </a>
            </li>
          ))}
        </ul>
        </div>
      </Reveal>
    </section>
  );
}
