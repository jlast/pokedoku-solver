import { getCategoryBarColor, parseCategoryId } from "./categoryUtils";
import { FILTER_CATEGORIES } from "../../../../../lib/shared/filters";
import { slugify } from "../../../lib/slug";
import { CategoryBadgeLink } from "../shared/CategoryBadgeLink";

export interface CategoryPair {
  categories: [string, string];
  count: number;
}

export function PairList({
  items,
  showDistributionBar = false,
  distributionTotal,
}: {
  items: CategoryPair[];
  showDistributionBar?: boolean;
  distributionTotal?: number;
}) {
  const categorySlugSet = new Set(
    FILTER_CATEGORIES.flatMap((filterCategory) =>
      filterCategory.options.map((option) => slugify(option.name)),
    ),
  );

  function getCategoryHref(label: string): string | null {
    const slug = slugify(label);
    return categorySlugSet.has(slug) ? `/category/${slug}/` : null;
  }

  const maxCount = showDistributionBar ? Math.max(...items.map((item) => item.count), 0) : 0;

  return (
    <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
      {items.map((item) => {
        const left = parseCategoryId(item.categories[0]);
        const right = parseCategoryId(item.categories[1]);
        const leftColor = getCategoryBarColor(left);
        const rightColor = getCategoryBarColor(right);
        const percent = showDistributionBar && distributionTotal && distributionTotal > 0 ? (item.count / distributionTotal) * 100 : 0;
        const barWidthPercent = showDistributionBar && maxCount > 0 ? (item.count / maxCount) * 100 : 0;
        const barWidth = item.count > 0 ? `max(${barWidthPercent}%, 8px)` : "0%";

        return (
          <li key={`${item.categories[0]}||${item.categories[1]}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="min-w-0 text-slate-700">
                <span className="inline-flex items-center gap-2 font-semibold text-slate-800">
                  <CategoryBadgeLink parsed={left} href={getCategoryHref(left.label)} />
                </span>
                <span className="mx-1 text-slate-400">+</span>
                <span className="inline-flex items-center gap-2 font-semibold text-slate-800">
                  <CategoryBadgeLink parsed={right} href={getCategoryHref(right.label)} />
                </span>
              </p>
              {showDistributionBar ? (
                <div className="mt-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: barWidth,
                        backgroundColor: leftColor,
                        backgroundImage: `linear-gradient(90deg, ${leftColor} 0%, ${rightColor} 100%)`,
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
            <div className="shrink-0 text-right">
              <span className="text-lg font-semibold text-slate-800">{item.count}</span>
              {showDistributionBar ? <p className="text-xs text-slate-500">{percent.toFixed(1)}%</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
