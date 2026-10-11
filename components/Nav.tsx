"use client";

import { useEffect, useState } from "react";

const links = [
  { id: "about", label: "About" },
  { id: "skills", label: "Skills" },
  { id: "soft-skills", label: "Soft Skills" },
  { id: "projects", label: "Projects" },
  { id: "activities", label: "Activities" },
  { id: "contact", label: "Contact" },
];

/** Outlined card nav with just the section links (centered on desktop, a Menu button on mobile). The current section's link turns plum and gets an underline; on mobile the links collapse into a menu card. */
export default function Nav() {
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Scroll-spy: a section is "current" when it crosses the middle band of the viewport.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    const top = document.getElementById("top");
    const clearOnTop = new IntersectionObserver(([e]) => e.isIntersecting && setActive(null), {
      rootMargin: "-45% 0px -50% 0px",
    });
    links.forEach((l) => {
      const el = document.getElementById(l.id);
      if (el) observer.observe(el);
    });
    if (top) clearOnTop.observe(top);
    return () => {
      observer.disconnect();
      clearOnTop.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="nav-enter sticky top-3 z-50 px-4 sm:top-4">
      <nav aria-label="Main" className="brutal-box relative ml-auto flex w-fit items-center p-1.5 md:mx-auto md:p-2">
        {/* Desktop links */}
        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const current = active === l.id;
            return (
              <li key={l.id}>
                <a
                  href={`#${l.id}`}
                  aria-current={current ? "location" : undefined}
                  className={`nav-link block rounded-[10px] border-2 border-transparent px-3.5 py-1.5 text-sm font-semibold transition-[background-color,border-color,color] duration-200 hover:border-ink hover:bg-mauve/60 ${
                    current ? "text-plum" : ""
                  }`}
                >
                  {l.label}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center md:hidden">
          <button
            type="button"
            className="brutal-btn !px-4 !py-2 text-sm !shadow-none"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>

        {/* Mobile menu card */}
        {open && (
          <div id="mobile-menu" className="brutal-box menu-drop absolute right-0 top-[calc(100%+0.6rem)] w-[min(20rem,calc(100vw-2rem))] p-2 md:hidden">
            <ul>
              {links.map((l, i) => (
                <li key={l.id}>
                  <a
                    href={`#${l.id}`}
                    onClick={() => setOpen(false)}
                    className={`flex items-baseline gap-4 rounded-[10px] px-4 py-3 font-display text-3xl ${
                      active === l.id ? "italic text-plum" : "hover:bg-mauve/60"
                    }`}
                  >
                    <span className="font-sans text-xs font-bold not-italic text-muted">0{i + 1}</span>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>
    </header>
  );
}
