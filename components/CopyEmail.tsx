"use client";

import { useState } from "react";

export default function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="brutal-btn text-sm"
      data-cursor-label={copied ? "Done" : "Copy"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(email);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* clipboard unavailable — the mailto link still works */
        }
      }}
    >
      <span aria-live="polite">{copied ? "Copied ✓" : "Copy email"}</span>
    </button>
  );
}
