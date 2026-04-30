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

  function getCategoryHref(label: string): string | null {
    const slug = slugify(label);
    return categorySlugSet.has(slug) ? `/category/${slug}/` : null;
  }

  return (
    <ul className="grid gap-3 text-left">
      {rows.map((row, index) => {
        const left = parseCategoryId(row.leftRaw);
        const right = parseCategoryId(row.rightRaw);

        return (
          <li key={`${row.leftRaw}-${row.rightRaw}-${index}`} className="grid items-center mb-2 gap-2 text-sm md:grid-cols-[minmax(0,1fr)_64px]">
            <div className="min-w-0">
              <span className="mb-1 flex items-center gap-2 font-semibold text-slate-800">
                <CategoryBadgeLink parsed={left} href={getCategoryHref(left.label)} />
                <span className="text-slate-400">+</span>
                <CategoryBadgeLink parsed={right} href={getCategoryHref(right.label)} />
              </span>
              <div className="h-2 overflow-hidden rounded-full">
                <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, row.widthPercent)).toFixed(1)}%`, background: row.gradient }} />
              </div>
            </div>
            <strong className="text-left">{row.percent > 10 ? `${Math.round(row.percent)}%` : `${row.percent.toFixed(1)}%`}</strong>
          </li>
        );
      })}
    </ul>
  );
}
