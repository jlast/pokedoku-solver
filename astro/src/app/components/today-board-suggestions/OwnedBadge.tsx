export function OwnedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--code-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.02em] text-[var(--text-h)]">
      <span aria-hidden="true" className="text-[11px] leading-none">✓</span>
      <span>Owned</span>
    </span>
  );
}
