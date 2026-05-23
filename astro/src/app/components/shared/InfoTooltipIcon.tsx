import { useState, useRef, useEffect } from "react";

interface InfoTooltipIconProps {
  text: string;
}

export function InfoTooltipIcon({ text }: InfoTooltipIconProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <span ref={ref} className="relative inline-flex items-center align-middle">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-label="More information"
        aria-expanded={open}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] transition-colors hover:border-slate-400 hover:text-[var(--text-h)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
      >
        <span className="block font-serif text-sm font-bold leading-none">i</span>
      </button>

      <span
        role="tooltip"
        className={`absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium leading-relaxed text-white shadow-lg transition-opacity
          ${open ? "opacity-100" : "pointer-events-none opacity-0"}
        `}
      >
        {text}
      </span>
    </span>
  );
}
