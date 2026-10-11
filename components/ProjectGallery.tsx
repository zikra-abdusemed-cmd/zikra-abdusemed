"use client";

import { useRef, useState } from "react";
import type { ProjectImage } from "@/lib/types";

/**
 * Photos at the top of a project card. Each photo is shown whole (never cropped) and the card grows to fit it.
 * With several photos: arrows, dots, arrow keys and swipe move between them.
 */
export default function ProjectGallery({ images, title }: { images: ProjectImage[]; title: string }) {
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const count = images.length;
  const current = Math.min(index, count - 1);
  const many = count > 1;
  const go = (by: number) => setIndex((current + by + count) % count);

  return (
    <div
      className="group/gallery relative -mx-6 -mt-6 mb-5 overflow-hidden rounded-t-[11px] border-b-[2.5px] border-ink bg-mauve/40"
      role={many ? "group" : undefined}
      aria-roledescription={many ? "carousel" : undefined}
      aria-label={many ? `${title} photos` : undefined}
      tabIndex={many ? 0 : undefined}
      onKeyDown={(e) => {
        if (!many) return;
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (!many || touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      }}
    >
      {images.map((img, i) => {
        // Extremely tall images (full-page screenshots) would shrink to an unreadable sliver:
        // show them at full width in a scrollable frame instead. Everything else is shown whole.
        const veryTall = !!img.w && !!img.h && img.h / img.w > 2.6;
        const photo = (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/uploads/${img.name}`}
            alt={many ? `${title}, photo ${i + 1} of ${count}` : title}
            width={img.w}
            height={img.h}
            loading={i === 0 ? "lazy" : "eager"}
            className={veryTall ? "h-auto w-full" : "mx-auto h-auto max-h-[34rem] w-full object-contain"}
          />
        );
        return (
          <div key={img.name} hidden={i !== current}>
            {veryTall ? (
              <div className="max-h-[30rem] overflow-y-auto" tabIndex={0} aria-label={`${title}: scroll to see the full image`}>
                {photo}
              </div>
            ) : (
              photo
            )}
            {veryTall && (
              <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-ink/85 px-2 py-0.5 text-[11px] font-bold text-white">
                Scroll ↓
              </span>
            )}
          </div>
        );
      })}

      {many && (
        <>
          <button type="button" aria-label="Previous photo" onClick={() => go(-1)} className="gallery-arrow left-2">
            ←
          </button>
          <button type="button" aria-label="Next photo" onClick={() => go(1)} className="gallery-arrow right-2">
            →
          </button>
          <span className="absolute right-2 top-2 rounded-full bg-ink/85 px-2 py-0.5 text-[11px] font-bold text-white">
            {current + 1} / {count}
          </span>
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
            {images.map((img, i) => (
              <button
                key={img.name}
                type="button"
                aria-label={`Photo ${i + 1}`}
                aria-current={i === current}
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full border border-ink transition-all ${i === current ? "w-5 bg-ink" : "w-2 bg-white"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
