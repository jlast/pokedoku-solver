import { useState } from "react";
import { getCategoryBarColor, getCategoryIconPath, type ParsedCategory } from "./categoryUtils";

export function CategoryIcon({ parsed }: { parsed: ParsedCategory }) {
  const [hidden, setHidden] = useState(false);
  const backgroundColor = getCategoryBarColor(parsed);

  if (hidden) {
    return <span aria-hidden className="inline-block h-4 w-4 rounded-full" style={{ backgroundColor }} />;
  }

  return (
    <span aria-hidden className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor }}>
      <img
        alt=""
        aria-hidden
        className="h-3 w-3"
        loading="lazy"
        onError={() => setHidden(true)}
        src={getCategoryIconPath(parsed)}
      />
    </span>
  );
}
