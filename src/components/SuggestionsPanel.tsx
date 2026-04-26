import { useState, useEffect, useRef, useMemo } from "react";
import type { Pokemon } from "../utils/types";
import { TYPE_COLORS, DEX_DIFFICULTY_COLORS } from "../utils/constants";
import { trackEvent } from "../utils/analytics";

interface SuggestionsPanelProps {
  selectedCell: [number, number] | null;
  possiblePokemon: Pokemon[];
  onSelect: (pokemon: Pokemon) => void;
}

export function SuggestionsPanel({
  selectedCell,
  possiblePokemon,
  onSelect,
}: SuggestionsPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [sortBy, setSortBy] = useState<"number-asc" | "number-desc" | "difficulty-desc" | "difficulty-asc">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("pokedoku-sort") as "number-asc" | "number-desc" | "difficulty-desc" | "difficulty-asc") || "number-asc";
    }
    return "number-asc";
  });

  function sortByColumn(column: "number" | "difficulty") {
    const newSort = column === "number"
      ? (sortBy === "number-asc" ? "number-desc" : "number-asc")
      : (sortBy === "difficulty-asc" ? "difficulty-desc" : "difficulty-asc");
    setSortBy(newSort);
    trackEvent("change_sort", { column, sort: newSort, source: "suggestions" });
  }
  useEffect(() => {
    localStorage.setItem("pokedoku-sort", sortBy);
  }, [sortBy]);

  const sortedPokemon = useMemo(() => {
    const copy = [...possiblePokemon];
    if (sortBy === "number-asc" ) {
      return copy.sort((a, b) => a.id - b.id);
    } else if (sortBy === "number-desc" ) {
      return copy.sort((a, b) => b.id - a.id);
    } else if (sortBy === "difficulty-asc") {
      return copy.sort((a, b) => {
        const aPercentile = a.dexDifficultyPercentile ?? 0;
        const bPercentile = b.dexDifficultyPercentile ?? 0;
        return bPercentile - aPercentile;
      });
    } else if (sortBy === "difficulty-desc") {
      return copy.sort((a, b) => {
        const aPercentile = a.dexDifficultyPercentile ?? 0;
        const bPercentile = b.dexDifficultyPercentile ?? 0;
        return aPercentile - bPercentile ;
      });
    }
  }, [possiblePokemon, sortBy]);

  if (!selectedCell) return null;

  return (
    <div className="suggestions-panel-wrapper">
      <div className="suggestions-panel" ref={containerRef}>
        <div className="panel-header">
          <div className="column-headers">
            <div>
              <span>
                {possiblePokemon.length} Pokémon
              </span>
            </div>
            <div className="column-header" onClick={() => sortByColumn('number')}>
              <div className="sort-arrows">
                <span className={sortBy === 'number-asc' ? 'active' : ''}>▲</span><span className={sortBy === 'number-desc' ? 'active' : ''}>▼</span>
              </div>
              <span>Pokemon</span>
            </div>
            <div className="column-header" onClick={() => sortByColumn('difficulty')}>
              <div className="sort-arrows">
                <span className={sortBy === 'difficulty-asc' ? 'active' : ''}>▲</span><span  className={sortBy === 'difficulty-desc' ? 'active' : ''}>▼</span>
              </div>
              <span>Dex Difficulty</span>
            </div>
          </div>
        </div>
        <div className="pokemon-list">
          {sortedPokemon?.length && sortedPokemon?.length > 0 ? (
            sortedPokemon?.map((p) => (
              <button
                key={`${p.id}-${p.name}`}
                className="pokemon-item"
                onClick={() => {
                  trackEvent("select_pokemon", {
                    name: p.name,
                    id: p.id,
                    types: p.types.join(","),
                  });
                  onSelect(p);
                }}
              >
                {p.sprite ? (
                  <img src={p.sprite} alt="" className="pokemon-sprite" />
                ) : (
                  <div className="pokemon-sprite-placeholder" />
                )}
                <div className="pokemon-item-top">
                  <div className="pokemon-item-name-row">
                    <span className="pokemon-name">{p.name}</span>
                    {p.dexDifficulty && (
                      <span
                        className="dex-difficulty-badge"
                        style={{
                          backgroundColor:
                            DEX_DIFFICULTY_COLORS[p.dexDifficulty],
                        }}
                        title="Easy = many choices • Nightmare = few choices"
                      >
                        {p.dexDifficulty}
                      </span>
                    )}
                  </div>
                  <div className="pokemon-item-bottom">
                    <span className="pokemon-id">#{p.id}</span>
                    <div className="pokemon-types">
                      {p.types.map((type, i) => (
                        <span
                          key={i}
                          className="type-badge"
                          style={{ backgroundColor: TYPE_COLORS[type!] }}
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <p className="no-pokemon">No Pokémon matches the constraints.</p>
          )}
        </div>
      </div>
      <div className="scroll-hint">
        <span className="scroll-hint-arrow" title="Scroll for more">
          ▼
        </span>
      </div>
    </div>
  );
}
