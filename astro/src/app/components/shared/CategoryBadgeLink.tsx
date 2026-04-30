import { CategoryIcon } from "../puzzle-stats/CategoryIcon";
import { getCategoryBarColor } from "../puzzle-stats/categoryUtils";

interface ParsedCategory {
  raw: string;
  type: string;
  label: string;
}

export function CategoryBadgeLink({ parsed, href }: { parsed: ParsedCategory; href: string | null }) {
  const badge = (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-white"
      style={{ backgroundColor: getCategoryBarColor(parsed) }}
    >
      <CategoryIcon parsed={parsed} />
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
