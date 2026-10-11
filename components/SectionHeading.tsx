import Reveal from "./Reveal";

export default function SectionHeading({ index, title, kicker }: { index: string; title: string; kicker?: string }) {
  return (
    <div className="mb-10 flex flex-wrap items-end gap-x-5 gap-y-3 sm:mb-14">
      <Reveal variant="shutter">
        <span className="brutal-border inline-block rounded-full bg-sage px-3 py-1 font-display text-sm font-semibold">
          {index}
        </span>
      </Reveal>
      <Reveal as="h2" variant="rise" delay={80} className="font-display text-4xl font-semibold tracking-tight sm:text-6xl">
        {title}
      </Reveal>
      {kicker && (
        <Reveal as="p" variant="wipe" delay={180} className="w-full max-w-xl text-muted sm:ml-auto sm:w-auto sm:text-right">
          {kicker}
        </Reveal>
      )}
    </div>
  );
}
