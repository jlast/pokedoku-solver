import { useState, useEffect, useRef, useMemo } from "react";
import type { Pokemon } from "@pokedoku-helper/shared-types";
import { DEX_DIFFICULTY_COLORS } from "../../../../lib/shared/constants";
import { trackEvent } from "../../../../lib/browser/analytics";
import { CategoryBadgeLink } from "./shared/CategoryBadgeLink";
import { parseCategoryId } from "./puzzle-stats/categoryUtils";

type SortBy =
  | "number-asc"
  | "number-desc"
  | "name-asc"
  | "name-desc"
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
      : newSort.startsWith("name")
        ? "name"
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
    } else if (sortBy === "name-asc") {
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "name-desc") {
      return copy.sort((a, b) => b.name.localeCompare(a.name));
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
    <div className="relative mb-4">
      <div className="relative mt-5 flex max-h-[500px] w-[418px] flex-col overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 max-[768px]:h-full max-[768px]:max-h-[350px] max-[768px]:w-[332px]" ref={containerRef}>
        <div className="sticky top-0 z-[5] shrink-0 bg-[var(--bg)]">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[var(--text-h)]">{possiblePokemon.length} Pokémon</span>
            <label className="flex items-center gap-1">
              <span className="text-[0.8rem] text-[#666]" aria-hidden="true">
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
              <span className="relative inline-flex items-center">
                <select
                  className="cursor-pointer appearance-none rounded-md border border-[var(--border)] bg-[var(--bg)] py-1 pl-2 pr-7 text-xs text-[var(--text)]"
                  aria-label="Sort Pokémon suggestions"
                  value={sortBy}
                  onChange={(event) => handleSortChange(event.target.value as SortBy)}
                >
                  <option value="number-asc">Pokemon # (low to high)</option>
                  <option value="number-desc">Pokemon # (high to low)</option>
                  <option value="name-asc">Name (A to Z)</option>
                  <option value="name-desc">Name (Z to A)</option>
                  <option value="difficulty-asc">Dex difficulty (hard to easy)</option>
                  <option value="difficulty-desc">Dex difficulty (easy to hard)</option>
                  <option value="recent-appearance">Recent appearance (oldest first)</option>
                  <option value="recent-appearance-newest">Recent appearance (newest first)</option>
                </select>
                <span className="pointer-events-none absolute right-2 inline-flex items-center text-[#666]" aria-hidden="true">
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
        <div className="flex flex-col gap-2">
          {sortedPokemon?.length && sortedPokemon?.length > 0 ? (
            sortedPokemon?.map((p) => (
              <button
                key={`${p.id}-${p.name}`}
                className="flex cursor-pointer flex-row gap-0 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-0 text-left transition-all hover:border-[var(--accent-border)] hover:bg-[var(--accent-bg)]"
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
                  <img src={p.sprite} alt="" className="m-3 mr-1 h-[50px] w-[50px] shrink-0 object-contain" />
                ) : (
                  <div className="m-3 mr-1 h-[50px] w-[50px] shrink-0 rounded-full bg-[var(--code-bg)]" />
                )}
                <div className="flex flex-1 flex-col">
                  <div className="flex flex-1 items-center gap-2 px-2 pb-1 pt-2">
                    <span className="shrink-0 text-[10px] font-semibold text-[#666]">#{p.id}</span>
                    <span className="flex-1 text-[12px] font-medium text-[#2c3e50]">{p.name}</span>
                    {p.dexDifficulty && (
                      <span
                        className="ml-auto shrink-0 rounded-[10px] px-2 py-[2px] text-[0.7rem] font-semibold uppercase text-white"
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
                  <div className="flex items-center gap-2 px-2 pb-2 text-[0.85rem] text-[#666]">
                    <div className="flex shrink-0 flex-wrap gap-0.5">
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
            <p className="p-5 text-center text-[#e74c3c]">No Pokémon matches the constraints.</p>
          )}
        </div>
      </div>
      {sortedPokemon && sortedPokemon.length >= 5 && (
        <div className="sticky left-1/2 -mt-10 h-8 w-8 -translate-x-4 rounded-full border border-[var(--border)] bg-white/50">
          <span className="flex h-full w-full items-center justify-center" title="Scroll for more">
            ▼
          </span>
        </div>
      )}
    </div>
  );
}
