import { CategoryIcon } from "../puzzle-stats/CategoryIcon";
import { getCategoryBarColor } from "../puzzle-stats/categoryUtils";

interface ParsedCategory {
  raw: string;
  type: string;
  label: string;
}

export function CategoryBadgeLink({ parsed, href, stacked = false }: { parsed: ParsedCategory; href: string | null; stacked?: boolean }) {
  const badge = (
    <span
      className={`inline-flex px-2 py-1 font-semibold text-white ${stacked ? 'min-w-[64px] rounded-md flex-col items-center gap-1 pt-2 text-[10px] leading-tight' : 'rounded-full items-center gap-1.5 text-xs'}`}
      style={{ backgroundColor: getCategoryBarColor(parsed) }}
    >
      <CategoryIcon parsed={parsed} layout={stacked ? 'vertical' : 'horizontal'} className={stacked ? 'h-[22.5px] w-[22.5px]' : ''} />
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
