import type { MouseEventHandler } from "react";
import type { Pokemon } from "@pokedoku-helper/shared-types";
import { DEX_DIFFICULTY_COLORS } from "../../../../../lib/shared/constants";
import { CategoryBadgeLink } from "./CategoryBadgeLink";
import { parseCategoryId } from "../puzzle-stats/categoryUtils";

interface PokemonCardProps {
  pokemon: Pokemon;
  href?: string | null;
  onClick?: MouseEventHandler<HTMLElement>;
}

export function PokemonCard({ pokemon, href = null, onClick }: PokemonCardProps) {
  const cardBody = (
    <>
      {pokemon.sprite ? (
        <img
          src={pokemon.sprite}
          alt=""
          className="h-20 w-20 object-contain"
          loading="lazy"
          decoding="async"
          fetchPriority="low"
        />
      ) : (
        <div className="h-20 w-20 rounded-full bg-[var(--code-bg)]" />
      )}
      <div className="flex w-full flex-col items-center gap-1">
        <div className="text-center text-[0.9rem] font-semibold text-[var(--text-h)]">{pokemon.name}</div>
        <div className="text-[0.8rem] text-[#666]">#{pokemon.id}</div>
        <div className="flex flex-wrap justify-center gap-1">
          {pokemon.types.map((type, i) => (
            <CategoryBadgeLink
              key={`${pokemon.id}-${type}-${i}`}
              parsed={parseCategoryId(`types:${type}`)}
              href={null}
            />
          ))}
        </div>
        {pokemon.dexDifficulty && (
          <span
            className="rounded-[10px] px-2 py-[2px] text-[0.65rem] font-semibold uppercase text-white"
            style={{
              backgroundColor: DEX_DIFFICULTY_COLORS[pokemon.dexDifficulty],
            }}
          >
            {pokemon.dexDifficulty}
          </span>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <a
        className="block min-h-[180px] cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 no-underline transition-all hover:border-[var(--accent-border)] hover:bg-[var(--accent-bg)]"
        href={href}
      >
        <div className="flex flex-col items-center">{cardBody}</div>
      </a>
    );
  }

  return (
    <div
      className="flex min-h-[180px] cursor-pointer flex-col items-center rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 transition-all hover:border-[var(--accent-border)] hover:bg-[var(--accent-bg)]"
      onClick={onClick}
    >
      {cardBody}
    </div>
  );
}
