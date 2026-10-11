"use client";

import { useEffect, useState } from "react";

/** Two-step delete button: first click arms it, second click within 3s confirms. */
export default function ConfirmButton({
  onConfirm,
  label = "Delete",
  disabled,
  className = "",
}: {
  onConfirm: () => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
      className={`brutal-btn !px-3 !py-1.5 text-xs ${armed ? "!bg-clay" : ""} ${className}`}
    >
      {armed ? "Sure?" : label}
    </button>
  );
}
