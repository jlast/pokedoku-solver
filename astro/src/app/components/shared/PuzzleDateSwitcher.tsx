import { DateChip } from "./DateChip";

function ArrowLink({ href, label, direction }: { href: string; label: string; direction: "left" | "right" }) {
  return (
    <a
      href={href}
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] no-underline transition-colors hover:bg-[var(--accent-bg)]"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d={direction === "left" ? "m15 18-6-6 6-6" : "m9 6 6 6-6 6"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}

interface PuzzleDateSwitcherAction {
  href: string;
  label: string;
}

interface PuzzleDateSwitcherProps {
  date: string;
  previousHref?: string | null;
  previousLabel?: string;
  nextHref?: string | null;
  nextLabel?: string;
  actions?: PuzzleDateSwitcherAction[];
}

export function PuzzleDateSwitcher({
  date,
  previousHref,
  previousLabel,
  nextHref,
  nextLabel,
  actions = [],
}: PuzzleDateSwitcherProps) {
  const hasDirectionalNav = Boolean(previousHref || nextHref);

  return (
    <div className="mb-4">
      <section className="flex items-center justify-center gap-2">
        {hasDirectionalNav ? (
          <>
            {previousHref ? <ArrowLink href={previousHref} label={previousLabel ?? "View previous board"} direction="left" /> : <div className="h-9 w-9" aria-hidden="true" />}
            <DateChip date={date} className="min-w-[220px] justify-center px-4 py-2 text-sm font-semibold" />
            {nextHref ? <ArrowLink href={nextHref} label={nextLabel ?? "View next board"} direction="right" /> : <div className="h-9 w-9" aria-hidden="true" />}
          </>
        ) : (
          <DateChip date={date} className="min-w-[220px] justify-center px-4 py-2 text-sm font-semibold" />
        )}
      </section>

      {actions.length > 0 ? (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {actions.map((action) => (
            <a
              key={`${action.href}:${action.label}`}
              href={action.href}
              className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-sm font-semibold text-[var(--text-h)] no-underline transition-colors hover:bg-[var(--accent-bg)]"
            >
              {action.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
