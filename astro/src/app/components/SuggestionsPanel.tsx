import { useState, useEffect, useRef, useMemo } from "react";
import type { Pokemon } from "../../../../lib/shared/types";
import { DEX_DIFFICULTY_COLORS } from "../../../../lib/shared/constants";
import { trackEvent } from "../../../../lib/browser/analytics";
import { CategoryBadgeLink } from "./shared/CategoryBadgeLink";
import { parseCategoryId } from "./puzzle-stats/categoryUtils";

type SortBy =
  | "number-asc"
  | "number-desc"
  | "difficulty-desc"
  | "difficulty-asc"
  | "recent-appearance"
  | "recent-appearance-newest";

interface PokemonRecentAppearanceItem {
  pokemonKeyId: number;
  daysSinceLastUsable?: number | null;
  lastUsableDate?: string | null;
}

interface PokemonRecentAppearanceFile {
  dateRange?: {
    to?: string;
  };
  items: PokemonRecentAppearanceItem[];
}

function parseDay(dateString: string): number {
  return new Date(`${dateString}T00:00:00.000Z`).getTime();
}

function toDaysSinceLastUsable(
  item: PokemonRecentAppearanceItem,
  latestPuzzleDate: string | undefined,
): number | null {
  if (typeof item.daysSinceLastUsable === "number") return item.daysSinceLastUsable;
  if (!item.lastUsableDate || !latestPuzzleDate) return null;
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((parseDay(latestPuzzleDate) - parseDay(item.lastUsableDate)) / millisecondsPerDay);
}

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
  const [daysSinceLastUsableByKeyId, setDaysSinceLastUsableByKeyId] = useState<Map<number, number | null>>(
    new Map(),
  );
  
  const [sortBy, setSortBy] = useState<SortBy>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("pokedoku-sort") as SortBy) || "difficulty-asc";
    }
    return "difficulty-asc";
  });

  function handleSortChange(newSort: SortBy) {
    setSortBy(newSort);
    const column = newSort.startsWith("number")
      ? "number"
      : newSort.startsWith("difficulty")
        ? "difficulty"
        : "recent-appearance";
    trackEvent("change_sort", { column, sort: newSort, source: "suggestions" });
  }

  useEffect(() => {
    localStorage.setItem("pokedoku-sort", sortBy);
  }, [sortBy]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/runtime/pokemon-last-usable.json?t=${Date.now()}`)
      .then((res) => res.json())
      .then((data: PokemonRecentAppearanceFile) => {
        const byKeyId = new Map<number, number | null>();
        const latestPuzzleDate = data.dateRange?.to;
        for (const item of data.items ?? []) {
          byKeyId.set(item.pokemonKeyId, toDaysSinceLastUsable(item, latestPuzzleDate));
        }
        setDaysSinceLastUsableByKeyId(byKeyId);
      })
      .catch((err) => {
        console.error("Failed to load Pokemon recent appearance:", err);
      });
  }, []);

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
    } else if (sortBy === "recent-appearance") {
      return copy.sort((a, b) => {
        const aDays = daysSinceLastUsableByKeyId.get(a.formId ?? a.id) ?? Number.POSITIVE_INFINITY;
        const bDays = daysSinceLastUsableByKeyId.get(b.formId ?? b.id) ?? Number.POSITIVE_INFINITY;
        if (bDays !== aDays) return bDays - aDays;
        return a.id - b.id;
      });
    } else if (sortBy === "recent-appearance-newest") {
      return copy.sort((a, b) => {
        const aDays = daysSinceLastUsableByKeyId.get(a.formId ?? a.id) ?? Number.POSITIVE_INFINITY;
        const bDays = daysSinceLastUsableByKeyId.get(b.formId ?? b.id) ?? Number.POSITIVE_INFINITY;
        if (aDays !== bDays) return aDays - bDays;
        return a.id - b.id;
      });
    }
  }, [daysSinceLastUsableByKeyId, possiblePokemon, sortBy]);

  if (!selectedCell) return null;

  return (
    <div className="suggestions-panel-wrapper">
      <div className="suggestions-panel" ref={containerRef}>
        <div className="panel-header">
          <div className="sort-header">
            <span className="panel-title">{possiblePokemon.length} Pokémon</span>
            <label className="sort-label">
              <span className="sort-icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M7 4v14m0 0-3-3m3 3 3-3M17 20V6m0 0-3 3m3-3 3 3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="sort-select-wrap">
                <select
                  className="sort-select"
                  aria-label="Sort Pokémon suggestions"
                  value={sortBy}
                  onChange={(event) => handleSortChange(event.target.value as SortBy)}
                >
                  <option value="number-asc">Pokemon # (low to high)</option>
                  <option value="number-desc">Pokemon # (high to low)</option>
                  <option value="difficulty-asc">Dex difficulty (hard to easy)</option>
                  <option value="difficulty-desc">Dex difficulty (easy to hard)</option>
                  <option value="recent-appearance">Recent appearance (oldest first)</option>
                  <option value="recent-appearance-newest">Recent appearance (newest first)</option>
                </select>
                <span className="sort-select-arrow" aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="m6 9 6 6 6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </span>
            </label>
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
                    <span className="pokemon-id">#{p.id}</span>
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
                     <div className="pokemon-types">
                       {p.types.map((type, i) => (
                         <CategoryBadgeLink
                           key={`${p.id}-${type}-${i}`}
                           parsed={parseCategoryId(`types:${type}`)}
                           href={null}
                         />
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
