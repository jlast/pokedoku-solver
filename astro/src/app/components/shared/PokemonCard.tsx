import type { MouseEventHandler } from "react";
import type { Pokemon } from "../../../../../lib/shared/types";
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
          className="pokemon-sprite"
          loading="lazy"
          decoding="async"
          fetchPriority="low"
        />
      ) : (
        <div className="pokemon-sprite-placeholder" />
      )}
      <div className="pokemon-card-info">
        <div className="pokemon-card-name">{pokemon.name}</div>
        <div className="pokemon-card-id">#{pokemon.id}</div>
        <div className="pokemon-types">
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
            className="dex-difficulty-badge"
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
      <a className="pokemon-card block no-underline" href={href}>
        {cardBody}
      </a>
    );
  }

  return (
    <div className="pokemon-card" onClick={onClick}>
      {cardBody}
    </div>
  );
}
