"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_PROJECT_IMAGES, type ProjectImage } from "@/lib/types";

const MAX_BYTES = 5 * 1024 * 1024;

type Item =
  | { key: string; kind: "existing"; name: string; url: string }
  | { key: string; kind: "new"; file: File; url: string; w: number; h: number };

/** Read a picked photo's natural size (as the browser will display it, EXIF rotation included). */
function measure(url: string) {
  return new Promise<{ w: number; h: number }>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 0, h: 0 });
    img.src = url;
  });
}

/**
 * Optional project photos: add several, reorder, remove. The first one is the cover.
 * Submits two fields: "images" (the newly picked files) and "imageOrder" (the final order, see saveProject).
 */
export default function PhotosField({ current = [] }: { current?: ProjectImage[] }) {
  const filesRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>(() =>
    current.map((img) => ({ key: img.name, kind: "existing", name: img.name, url: `/uploads/${img.name}` })),
  );
  const [error, setError] = useState<string | null>(null);

  const news = items.filter((it) => it.kind === "new");

  // keep the real (hidden) file input in sync with the list, so a plain FormData(form) picks the files up
  useEffect(() => {
    if (!filesRef.current) return;
    const dt = new DataTransfer();
    news.forEach((it) => dt.items.add(it.file));
    filesRef.current.files = dt.files;
  });

  // free preview URLs when the form goes away
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => () => itemsRef.current.forEach((it) => it.kind === "new" && URL.revokeObjectURL(it.url)), []);

  const order = JSON.stringify(
    items.map((it) => (it.kind === "existing" ? `e:${it.name}` : `n:${news.indexOf(it)}:${it.w}x${it.h}`)),
  );

  const add = async (picked: File[]) => {
    setError(null);
    const room = MAX_PROJECT_IMAGES - items.length;
    const problems: string[] = [];
    if (picked.length > room) problems.push(`Only ${MAX_PROJECT_IMAGES} photos per project.`);
    const accepted: Item[] = [];
    for (const file of picked.slice(0, Math.max(0, room))) {
      if (file.size > MAX_BYTES) {
        problems.push(`"${file.name}" is over 5 MB.`);
        continue;
      }
      const url = URL.createObjectURL(file);
      accepted.push({ key: `${file.name}-${file.size}-${Math.random()}`, kind: "new", file, url, ...(await measure(url)) });
    }
    if (problems.length) setError(problems.join(" "));
    if (accepted.length) setItems((list) => [...list, ...accepted]);
  };

  const move = (i: number, by: -1 | 1) =>
    setItems((list) => {
      const j = i + by;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const remove = (i: number) =>
    setItems((list) => {
      const it = list[i];
      if (it.kind === "new") URL.revokeObjectURL(it.url);
      return list.filter((_, k) => k !== i);
    });

  return (
    <div className="grid gap-2 text-sm font-bold">
      <span>
        Photos{" "}
        <span className="font-normal text-muted">
          (optional · up to {MAX_PROJECT_IMAGES} · JPG, PNG, WebP or GIF, max 5 MB each)
        </span>
      </span>

      {items.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {items.map((it, i) => (
            <li key={it.key} className="brutal-border relative overflow-hidden rounded-[10px] bg-mauve/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.url} alt="" className="aspect-square w-full object-contain" />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-bold text-white">
                  Cover
                </span>
              )}
              <div className="flex border-t-2 border-ink bg-card text-xs">
                <button type="button" aria-label="Move earlier" disabled={i === 0} onClick={() => move(i, -1)} className="flex-1 py-1 hover:bg-mauve disabled:opacity-30">
                  ←
                </button>
                <button type="button" aria-label="Move later" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="flex-1 border-x-2 border-ink py-1 hover:bg-mauve disabled:opacity-30">
                  →
                </button>
                <button type="button" aria-label="Remove photo" onClick={() => remove(i)} className="flex-1 py-1 hover:bg-clay">
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {items.length < MAX_PROJECT_IMAGES && (
        <label className="brutal-btn w-fit cursor-pointer !px-3 !py-1.5 text-xs">
          {items.length ? "Add more photos" : "Choose photos"}
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              e.target.value = ""; // allow picking the same file again later
              void add(picked);
            }}
          />
        </label>
      )}

      <input ref={filesRef} type="file" name="images" multiple hidden tabIndex={-1} />
      <input type="hidden" name="imageOrder" value={order} />
      {error && <p className="text-xs font-semibold text-[#a3344a]">{error}</p>}
    </div>
  );
}
