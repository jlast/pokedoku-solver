import { CategoryIcon } from "./CategoryIcon";
import { getCategoryBarColor, parseCategoryId } from "./categoryUtils";

export interface CategoryCount {
  categoryId: string;
  count: number;
}

export function CategoryList({
  items,
  showDistributionBar = false,
  distributionTotal,
  maxBarWidthPercent = 100,
}: {
  items: CategoryCount[];
  showDistributionBar?: boolean;
  distributionTotal?: number;
  maxBarWidthPercent?: number;
}) {
  const maxCount = showDistributionBar ? Math.max(...items.map((item) => item.count), 0) : 0;

  return (
    <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
      {items.map((item) => {
        const parsed = parseCategoryId(item.categoryId);
        const percent = showDistributionBar && distributionTotal && distributionTotal > 0 ? (item.count / distributionTotal) * 100 : 0;
        const barWidthPercent = showDistributionBar && maxCount > 0 ? (item.count / maxCount) * 100 : 0;
        const barColor = showDistributionBar ? getCategoryBarColor(parsed) : "#0f766e";
        const scaledBarWidthPercent = (barWidthPercent * maxBarWidthPercent) / 100;
        const barWidth = item.count > 0 ? `max(${scaledBarWidthPercent}%, 8px)` : "0%";

        return (
          <li key={item.categoryId} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate font-semibold text-slate-800">
                <CategoryIcon parsed={parsed} />
                <span className="truncate">{parsed.label}</span>
              </p>
              {showDistributionBar ? (
                <div className="mt-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full">
                    <div className="h-full rounded-full" style={{ width: barWidth, backgroundColor: barColor }} />
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
