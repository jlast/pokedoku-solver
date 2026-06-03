import { CategoryIcon } from "../puzzle-stats/CategoryIcon";
import { getCategoryBarColor, type ParsedCategory } from "../puzzle-stats/categoryUtils";

export function CategoryBadgeLink({
  parsed,
  href,
  stacked = false,
  compact = false,
}: {
  parsed: ParsedCategory;
  href: string | null;
  stacked?: boolean;
  compact?: boolean;
}) {
  const badge = (
    <span
        className={`inline-flex font-semibold text-white ${stacked
          ? 'min-w-[64px] rounded-md flex-col items-center gap-1 px-2 py-1 pt-2 text-[10px] leading-tight'
          : compact
          ? 'items-center gap-1 rounded-full px-2 py-0.5 text-[0.55rem]'
          : 'items-center gap-1.5 rounded-full px-2 py-1 text-xs'}`}
      style={{ backgroundColor: getCategoryBarColor(parsed) }}
    >
        <CategoryIcon
          parsed={parsed}
          layout={stacked ? 'vertical' : 'horizontal'}
          className={stacked ? 'h-[22.5px] w-[22.5px]' : compact ? 'h-3.5 w-3.5' : ''}
        />
      <span>{parsed.label}</span>
    </span>
  );

  if (!href) return badge;

  return (
    <a href={href} className="inline-flex no-underline hover:opacity-85" title={`Open ${parsed.label} category`}>
      {badge}
    </a>
  );
}
