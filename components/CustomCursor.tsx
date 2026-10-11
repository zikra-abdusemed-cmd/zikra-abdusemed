"use client";

import { useEffect, useRef } from "react";

const INTERACTIVE = "a, button, [role='tab'], summary, label[for], select";

/**
 * Two-part cursor: a dot that tracks the pointer exactly and a ring that trails it.
 * - Links/buttons: ring morphs into a rotated sage square.
 * - Elements with data-cursor-label="...": ring grows into a blob showing that label.
 * Only enabled for fine pointers (mouse/trackpad); DOM is updated directly, no React re-renders.
 */
export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const dot = dotRef.current!;
    const ring = ringRef.current!;
    const label = labelRef.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;
    root.classList.add("has-custom-cursor");

    const target = { x: -100, y: -100 };
    const pos = { x: -100, y: -100 };
    let raf = 0;
    let hoverState: "idle" | "hover" | "label" | "mini" = "idle";

    const tick = () => {
      const k = reduced ? 1 : 0.2;
      pos.x += (target.x - pos.x) * k;
      pos.y += (target.y - pos.y) * k;
      ring.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      raf = Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) > 0.1 ? requestAnimationFrame(tick) : 0;
    };

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      dot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      dot.dataset.hidden = ring.dataset.hidden = "false";
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onOver = (e: PointerEvent) => {
      const el = e.target as Element | null;
      const labelled = el?.closest<HTMLElement>("[data-cursor-label]");
      if (el?.closest("[data-cursor-mini]")) {
        hoverState = "mini";
      } else if (labelled) {
        hoverState = "label";
        label.textContent = labelled.dataset.cursorLabel ?? "";
      } else if (el?.closest(INTERACTIVE)) {
        hoverState = "hover";
      } else {
        hoverState = "idle";
      }
      ring.dataset.state = hoverState;
    };

    const onDown = () => (ring.dataset.state = "down");
    const onUp = () => (ring.dataset.state = hoverState);
    const onLeave = () => (dot.dataset.hidden = ring.dataset.hidden = "true");

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.documentElement.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      root.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div aria-hidden className="hidden [@media(pointer:fine)]:block">
      <div ref={ringRef} className="cursor-ring" data-state="idle" data-hidden="true">
        <span className="cursor-ring-shape" />
        <span ref={labelRef} className="cursor-ring-label" />
      </div>
      <div ref={dotRef} className="cursor-dot" data-hidden="true" />
    </div>
  );
}
