export default function Marquee({ items }: { items: string[] }) {
  const row = [...items, ...items];
  return (
    // Outer wrapper clips the tilted band's corners so it never causes horizontal scroll.
    <div aria-hidden className="overflow-hidden py-6">
      <div className="-mx-4 -rotate-[1.5deg] border-y-[2.5px] border-ink bg-ink py-3 text-paper">
        <div className="marquee-track">
          {[0, 1].map((k) => (
            <div key={k} className="flex shrink-0 items-center">
              {row.map((item, i) => (
                <span key={i} className="flex items-center gap-6 px-6 font-display text-2xl italic sm:text-3xl">
                  {item}
                  <span className="text-sage">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
