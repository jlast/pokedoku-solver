interface DateChipProps {
  date: string;
  className?: string;
}

export function DateChip({ date, className = "" }: DateChipProps) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg bg-[var(--code-bg)] px-3 py-1.5 text-[0.85rem] text-[var(--text)] ${className}`.trim()}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" />
      </svg>
      <span data-header-date>{date}</span>
    </div>
  );
}
