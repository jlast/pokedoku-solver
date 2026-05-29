import { useState } from "react";
import { getCategoryBarColor, getCategoryIconPath, type ParsedCategory } from "./categoryUtils";

const COMPACT_HORIZONTAL_ICON_CLASSES = 'h-3 w-3';

export function CategoryIcon({ parsed, layout = 'horizontal', className = '' }: { parsed: ParsedCategory; layout?: 'vertical' | 'horizontal'; className?: string }) {
  const [hidden, setHidden] = useState(false);
  const backgroundColor = getCategoryBarColor(parsed);
  const isCompactHorizontal = layout === 'horizontal' && className.includes(COMPACT_HORIZONTAL_ICON_CLASSES);

  if (hidden) {
    return layout === 'vertical'
      ? <span aria-hidden className="inline-block h-4 w-4 rounded-sm bg-[var(--bg)]/90" />
      : <span aria-hidden className={isCompactHorizontal ? 'inline-block h-3 w-3 rounded-full' : 'inline-block h-4 w-4 rounded-full'} style={{ backgroundColor }} />;
  }

  if (layout === 'vertical') {
    return (
      <img
        alt=""
        aria-hidden
        className={`h-4 w-4 ${className}`}
        loading="lazy"
        onError={() => setHidden(true)}
        src={getCategoryIconPath(parsed)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={isCompactHorizontal
        ? 'inline-flex h-3 w-3 shrink-0 items-center justify-center rounded-full'
        : 'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full'}
      style={{ backgroundColor }}
    >
      <img
        alt=""
        aria-hidden
        className={isCompactHorizontal ? 'h-2 w-2' : 'h-3 w-3'}
        loading="lazy"
        onError={() => setHidden(true)}
        src={getCategoryIconPath(parsed)}
      />
    </span>
  );
}
