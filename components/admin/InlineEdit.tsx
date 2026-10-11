"use client";

import { useState } from "react";

/** Text that turns into an input on click; Enter saves, Escape cancels. */
export default function InlineEdit({
  value,
  onSave,
  className = "",
  inputClassName = "",
  ariaLabel,
}: {
  value: string;
  onSave: (next: string) => void;
  className?: string;
  inputClassName?: string;
  ariaLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <button
        type="button"
        title="Click to rename"
        aria-label={`${ariaLabel}: ${value} (click to rename)`}
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className={`text-left underline-offset-4 decoration-dashed hover:underline ${className}`}
      >
        {value}
      </button>
    );
  }

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== value) onSave(next);
  };

  return (
    <input
      autoFocus
      aria-label={ariaLabel}
      value={draft}
      maxLength={60}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
        if (e.key === "Escape") setEditing(false);
      }}
      className={`brutal-input !py-1 ${inputClassName}`}
    />
  );
}
