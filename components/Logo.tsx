/**
 * Personal mark: a shield (security) holding code brackets (software)
 * with a pen nib in place of the slash (design).
 */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden focusable="false">
      {/* shield */}
      <path
        d="M20 3 L34 8 V19 C34 28 28.5 33.8 20 37 C11.5 33.8 6 28 6 19 V8 Z"
        fill="var(--color-plum)"
        stroke="var(--color-ink)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* code brackets */}
      <path
        d="M13.5 14.5 L9.5 19.5 L13.5 24.5 M26.5 14.5 L30.5 19.5 L26.5 24.5"
        fill="none"
        stroke="var(--color-card)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* pen nib, tilted to double as the slash in </> */}
      <g transform="rotate(20 20 20)">
        <path
          d="M20 11.5 L24 19 L20 28.5 L16 19 Z"
          fill="var(--color-sand)"
          stroke="var(--color-ink)"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M20 21 V28" stroke="var(--color-ink)" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="20" cy="19.5" r="1.5" fill="var(--color-ink)" />
      </g>
    </svg>
  );
}
