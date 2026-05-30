import { useState, useEffect, useRef, useMemo } from "react";
import type { Pokemon } from "@pokedoku-helper/shared-types";
import { DEX_DIFFICULTY_COLORS } from "../../../../lib/shared/constants";
import { trackEvent } from "../../../../lib/browser/analytics";
import { CategoryBadgeLink } from "./shared/CategoryBadgeLink";
import { parseCategoryId } from "./puzzle-stats/categoryUtils";
import { getPokemonKeyId } from "../lib/pokemonGrid";

type SortBy =
  | "number-asc"
  | "number-desc"
  | "difficulty-desc"
  | "difficulty-asc"
  | "recent-appearance";

const SORT_OPTIONS: SortBy[] = ["number-asc", "number-desc", "difficulty-asc", "difficulty-desc", "recent-appearance"];

function isSortBy(value: string | null): value is SortBy {
  return value !== null && SORT_OPTIONS.includes(value as SortBy);
}

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
  currentPokemon?: Pokemon | null;
  ownedPokemonKeyIds?: Set<number>;
  shinyPokemonKeyIds?: Set<number>;
  showOwnershipState?: boolean;
  anchorElement?: HTMLElement | null;
  onClose?: () => void;
  onSelect: (pokemon: Pokemon) => void;
}

export function SuggestionsPanel({
  selectedCell,
  possiblePokemon,
  currentPokemon = null,
  ownedPokemonKeyIds,
  shinyPokemonKeyIds,
  showOwnershipState = true,
  anchorElement: _anchorElement,
  onClose,
  onSelect,
}: SuggestionsPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [daysSinceLastUsableByKeyId, setDaysSinceLastUsableByKeyId] = useState<Map<number, number | null>>(
    new Map(),
  );
  const [sortBy, setSortBy] = useState<SortBy>(() => {
    if (typeof window !== "undefined") {
      const savedSort = localStorage.getItem("pokedoku-sort");
      return isSortBy(savedSort) ? savedSort : "difficulty-asc";
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
    }
    return copy;
  }, [daysSinceLastUsableByKeyId, possiblePokemon, sortBy]);

  const displayedPokemon = useMemo(() => {
    if (!ownedPokemonKeyIds || !showOwnershipState) return sortedPokemon;

    const owned: Pokemon[] = [];
    const unowned: Pokemon[] = [];

    for (const pokemon of sortedPokemon) {
      if (ownedPokemonKeyIds.has(getPokemonKeyId(pokemon))) {
        owned.push(pokemon);
      } else {
        unowned.push(pokemon);
      }
    }

    const isCurrentOwned = currentPokemon ? ownedPokemonKeyIds.has(getPokemonKeyId(currentPokemon)) : false;
    return isCurrentOwned ? owned : [...unowned, ...owned];
  }, [currentPokemon, ownedPokemonKeyIds, showOwnershipState, sortedPokemon]);

  const counts = useMemo(() => {
    if (!ownedPokemonKeyIds || !showOwnershipState) {
      return { total: displayedPokemon.length, owned: 0, unowned: displayedPokemon.length };
    }

    let owned = 0;
    for (const pokemon of displayedPokemon) {
      if (ownedPokemonKeyIds.has(getPokemonKeyId(pokemon))) owned += 1;
    }

    return {
      total: displayedPokemon.length,
      owned,
      unowned: displayedPokemon.length - owned,
    };
  }, [displayedPokemon, ownedPokemonKeyIds, showOwnershipState]);

  if (!selectedCell) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/10 p-3 backdrop-blur-[2px]" onClick={onClose}>
      <div className="relative flex h-[660px] w-[418px] max-w-full flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.28)] max-[768px]:h-[490px] max-[768px]:w-[332px]" ref={containerRef} onClick={(event) => event.stopPropagation()}>
        <div className="-mx-4 -mt-4 shrink-0 border-b border-[var(--border)] bg-[var(--bg)] px-4 pt-4 pb-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex flex-col text-left">
                <span className="font-semibold text-[var(--text-h)]">{counts.total} Pokemon</span>
                {ownedPokemonKeyIds && showOwnershipState ? (
                  <span className="text-xs font-medium text-[var(--text)]">
                    {counts.unowned} unowned, {counts.owned} owned
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] transition-colors hover:bg-[var(--code-bg)]"
                aria-label="Close suggestions"
                onClick={onClose}
              >
                <span aria-hidden="true" className="text-base leading-none">×</span>
              </button>
            </div>
            <label className="flex max-w-full items-center gap-1 self-start">
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
              <span className="relative inline-flex max-w-full items-center">
                <select
                  className="max-w-[250px] cursor-pointer appearance-none rounded-md border border-[var(--border)] bg-[var(--bg)] py-1 pl-2 pr-7 text-xs text-[var(--text)] max-[768px]:max-w-[220px]"
                  aria-label="Sort Pokémon suggestions"
                  value={sortBy}
                  onChange={(event) => handleSortChange(event.target.value as SortBy)}
                >
                  <option value="number-asc">Pokemon # (low to high)</option>
                  <option value="number-desc">Pokemon # (high to low)</option>
                  <option value="difficulty-asc">Dex difficulty (hard to easy)</option>
                  <option value="difficulty-desc">Dex difficulty (easy to hard)</option>
                  <option value="recent-appearance">By oldest appearance</option>
                </select>
                <span className="pointer-events-none absolute right-2 inline-flex items-center text-[var(--text)]" aria-hidden="true">
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
        <div className="min-h-0 flex-1 overflow-y-auto pt-3">
          <div className="flex flex-col gap-2">
          {displayedPokemon.length > 0 ? (
            displayedPokemon.map((p) => {
              const pokemonKeyId = getPokemonKeyId(p);
              const isOwned = showOwnershipState && (ownedPokemonKeyIds?.has(pokemonKeyId) ?? false);
              const isShiny = showOwnershipState && (shinyPokemonKeyIds?.has(pokemonKeyId) ?? false);

              return (
              <button
                key={`${p.id}-${p.name}`}
                className={`flex cursor-pointer flex-row gap-0 rounded-lg border p-0 text-left transition-all hover:border-[var(--accent-border)] hover:bg-[var(--accent-bg)] ${isShiny ? "border-amber-300 bg-amber-200 [html[data-theme='dark']_&]:border-amber-700 [html[data-theme='dark']_&]:bg-amber-900/35" : isOwned ? "border-[var(--border)] bg-[var(--code-bg)]" : "border-[var(--border)] bg-[var(--bg)]"}`}
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
                  <img src={p.sprite} alt="" className={`m-3 mr-1 h-[50px] w-[50px] shrink-0 object-contain ${isOwned ? 'opacity-65' : ''}`} />
                ) : (
                  <div className="m-3 mr-1 h-[50px] w-[50px] shrink-0 rounded-full bg-[var(--code-bg)]" />
                )}
                <div className="flex flex-1 flex-col">
                  <div className="flex flex-1 items-center gap-2 px-2 pb-1 pt-2">
                    <span className="shrink-0 text-[10px] font-semibold text-[var(--text)]">#{p.id}</span>
                    <span className="flex-1 text-[12px] font-medium text-[var(--text-h)]">{p.name}</span>
                    {isOwned ? (
                      <span className={`hidden items-center gap-1 rounded-full px-2 py-[2px] text-[0.65rem] font-bold uppercase md:inline-flex ${isShiny ? "border border-amber-300 bg-amber-200 text-amber-950 [html[data-theme='dark']_&]:border-amber-700 [html[data-theme='dark']_&]:bg-amber-900/45 [html[data-theme='dark']_&]:text-amber-100" : "border border-[var(--border)] bg-[var(--code-bg)] text-[var(--text-h)]"}`}>
                        <span aria-hidden="true" className="text-[10px] leading-none">✓</span>
                        <span>{isShiny ? 'Shiny' : 'Owned'}</span>
                      </span>
                    ) : null}
                    {p.dexDifficulty && (
                      <span
                        className="ml-auto hidden shrink-0 rounded-[10px] px-2 py-[2px] text-[0.7rem] font-semibold uppercase text-white md:inline-flex"
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
                  <div className="flex items-center gap-2 px-2 pb-2 text-[0.85rem] text-[var(--text)]">
                    <div className="hidden shrink-0 flex-wrap gap-0.5 md:flex">
                        {p.types.map((type, i) => (
                         <CategoryBadgeLink
                            key={`${p.id}-${type}-${i}`}
                            parsed={parseCategoryId(`types:${type}`)}
                            href={null}
                          />
                        ))}
                     </div>
                    <div className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase text-[var(--text)] md:hidden">
                      {isOwned ? (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-[2px] ${isShiny ? "border border-amber-300 bg-amber-200 text-amber-950 [html[data-theme='dark']_&]:border-amber-700 [html[data-theme='dark']_&]:bg-amber-900/45 [html[data-theme='dark']_&]:text-amber-100" : "border border-[var(--border)] bg-[var(--code-bg)] text-[var(--text-h)]"}`}>
                          <span aria-hidden="true" className="text-[10px] leading-none">✓</span>
                          <span>{isShiny ? 'Shiny' : 'Owned'}</span>
                        </span>
                      ) : null}
                      {p.dexDifficulty ? (
                        <span
                          className="inline-flex items-center rounded-full px-2 py-[2px] text-white"
                          style={{
                            backgroundColor: DEX_DIFFICULTY_COLORS[p.dexDifficulty],
                          }}
                          title="Easy = many choices • Nightmare = few choices"
                        >
                          {p.dexDifficulty}
                        </span>
                      ) : null}
                    </div>
                   </div>
                </div>
              </button>
            );})
          ) : (
            <p className="p-5 text-center text-red-500">No Pokémon matches the constraints.</p>
          )}
          </div>
        </div>
        {displayedPokemon.length >= 5 && (
          <div className="pointer-events-none absolute bottom-2 left-1/2 z-[1] flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)]/85 shadow-sm backdrop-blur-sm">
            <span className="flex h-full w-full items-center justify-center" title="Scroll for more">
              ▼
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
