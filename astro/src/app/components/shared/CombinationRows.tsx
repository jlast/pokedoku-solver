import { parseCategoryId } from "../puzzle-stats/categoryUtils";
import { FILTER_CATEGORIES } from "../../../../../lib/shared/filters";
import { slugify } from "../../../lib/slug";
import { CategoryBadgeLink } from "./CategoryBadgeLink";

export interface CombinationRow {
  leftRaw: string;
  rightRaw: string;
  percent: number;
  widthPercent: number;
  gradient: string;
}

export function CombinationRows({ rows }: { rows: CombinationRow[] }) {
  const categorySlugSet = new Set(
    FILTER_CATEGORIES.flatMap((filterCategory) =>
      filterCategory.options.map((option) => slugify(option.name)),
    ),
  );

  function getPairHref(leftLabel: string, rightLabel: string): string | null {
    const leftSlug = slugify(leftLabel);
    const rightSlug = slugify(rightLabel);
    if (!categorySlugSet.has(leftSlug) || !categorySlugSet.has(rightSlug)) return null;
    const [a, b] = [leftSlug, rightSlug].sort((x, y) => x.localeCompare(y));
    return `/tools/category/${a}/${b}/`;
  }

  return (
    <ul className="grid gap-3 text-left">
      {rows.map((row, index) => {
        const left = parseCategoryId(row.leftRaw);
        const right = parseCategoryId(row.rightRaw);
        const pairHref = getPairHref(left.label, right.label);
        const colors = row.gradient.match(/#(?:[0-9a-fA-F]{3}){1,2}/g) ?? [];
        const leftColor = colors[0] ?? "#e2e8f0";
        const rightColor = colors[1] ?? "#cbd5e1";

        return (
          <li key={`${row.leftRaw}-${row.rightRaw}-${index}`} className="mb-2">
            <a
              href={pairHref ?? "#"}
              className={`grid items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm no-underline transition ${
                pairHref ? "hover:border-slate-300" : "pointer-events-none"
              } grid-cols-[minmax(0,1fr)_auto]`}
              style={{
                background: `linear-gradient(90deg, ${leftColor}18 0%, ${rightColor}18 100%), #ffffff`,
              }}
              aria-label={`Open ${left.label} and ${right.label} combination page`}
            >
              <div className="min-w-0">
                <span className="mb-1 flex items-center gap-2 font-semibold text-slate-800">
                  <CategoryBadgeLink parsed={left} href={null} />
                  <span className="text-slate-400">+</span>
                  <CategoryBadgeLink parsed={right} href={null} />
                </span>
                <div className="h-2 overflow-hidden rounded-full">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, row.widthPercent)).toFixed(1)}%`, background: row.gradient }} />
                </div>
              </div>
              <span className="flex items-center gap-2 pl-2 text-slate-400">
                <strong className="text-slate-700">{row.percent > 10 ? `${Math.round(row.percent)}%` : `${row.percent.toFixed(1)}%`}</strong>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
