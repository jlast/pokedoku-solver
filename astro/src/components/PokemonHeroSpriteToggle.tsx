import { useState } from "react";

interface PokemonHeroSpriteToggleProps {
  name: string;
  sprite?: string;
  shinySprite?: string;
}

export function PokemonHeroSpriteToggle({
  name,
  sprite,
  shinySprite,
}: PokemonHeroSpriteToggleProps) {
  const hasShinySprite = Boolean(shinySprite);
  const [isShinySelected, setIsShinySelected] = useState(false);
  const imageSrc = isShinySelected && shinySprite ? shinySprite : sprite;
  const imageAlt = isShinySelected && shinySprite ? `${name} shiny` : name;

  if (!imageSrc) {
    return (
      <div className="text-4xl font-bold text-[var(--text-h)]">{name.slice(0, 1)}</div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <img src={imageSrc} alt={imageAlt} className="h-44 w-44 object-contain" loading="lazy" />
      {hasShinySprite ? (
        <div className="inline-flex rounded-full border border-[var(--border)] bg-[var(--bg)] p-1">
          <button
            type="button"
            onClick={() => setIsShinySelected(false)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              !isShinySelected
                ? "bg-[var(--text-h)] text-[var(--bg)]"
                : "text-[var(--text)] hover:bg-[var(--code-bg)]"
            }`}
            aria-pressed={!isShinySelected}
          >
            Normal
          </button>
          <button
            type="button"
            onClick={() => setIsShinySelected(true)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              isShinySelected
                ? "bg-amber-400 text-amber-950"
                : "text-[var(--text)] hover:bg-[var(--code-bg)]"
            }`}
            aria-pressed={isShinySelected}
          >
            Shiny
          </button>
        </div>
      ) : null}
    </div>
  );
}
