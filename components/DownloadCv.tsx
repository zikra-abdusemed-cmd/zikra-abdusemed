/** "Download CV" button. Only rendered when a PDF exists in the /cv folder (see lib/cv.ts). */
export default function DownloadCv({ className = "" }: { className?: string }) {
  return (
    <a href="/cv" download className={`brutal-btn group ${className}`} data-cursor-label="Grab it" data-mascot="cv">
      Download CV
      <svg aria-hidden viewBox="0 0 16 16" width="15" height="15" className="transition-transform duration-300 group-hover:translate-y-0.5">
        <path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M3 13.5h10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}
