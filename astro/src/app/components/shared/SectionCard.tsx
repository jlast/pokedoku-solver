import type { ReactNode } from "react";

interface SectionCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
}

const cardClassName = "rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]";
const headingClassName = "inline-flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-800";

export function SectionCard({ title, subtitle, headerRight, children, className }: SectionCardProps) {
  return (
    <article className={`${cardClassName}${className ? ` ${className}` : ""}`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className={headingClassName}>{title}</h2>
          {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
        </div>
        {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
      </div>
      {children}
    </article>
  );
}
