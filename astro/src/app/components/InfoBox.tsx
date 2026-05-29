interface InfoBoxProps {
  children: string;
  className?: string;
}

export function InfoBox({ children, className }: InfoBoxProps) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--code-bg)] px-4 py-3 text-sm text-[var(--text)] ${className ?? ''}`}>
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-600">
        <span className="text-sm leading-none font-bold text-white">i</span>
      </div>
      <span className="opacity-90">{children}</span>
    </div>
  );
}
