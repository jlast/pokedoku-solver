import type { ReactNode } from "react";

interface SectionCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
}

const cardClassName = "rounded-3xl border border-[var(--border)] bg-[var(--bg)] p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]";
const headingClassName = "inline-flex items-center gap-2 text-xl font-semibold tracking-tight text-[var(--text-h)]";

export function SectionCard({ title, subtitle, headerRight, children, className }: SectionCardProps) {
  return (
    <article className={`${cardClassName}${className ? ` ${className}` : ""}`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className={headingClassName}>{title}</h2>
          {subtitle ? <div className="mt-1 text-xs text-[var(--text)]">{subtitle}</div> : null}
        </div>
        {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
      </div>
      {children}
    </article>
  );
}
