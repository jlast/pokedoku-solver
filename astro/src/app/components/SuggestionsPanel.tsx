import { useState, useEffect, useRef, useMemo } from 'react';
import type { Pokemon } from '@pokedoku-helper/shared-types';
import { DEX_DIFFICULTY_COLORS } from '../../../../lib/shared/constants';
import type { Constraint } from '../../../../lib/shared/filters';
import { trackEvent } from '../../../../lib/browser/analytics';
import { slugify } from '../../lib/slug';
import { PokeballIcon } from './shared/PokeballIcon';
import { CategoryBadgeLink } from './shared/CategoryBadgeLink';
import { parseCategoryId } from './puzzle-stats/categoryUtils';
import { constraintToParsedCategory, getPokemonKeyId } from '../lib/pokemonGrid';

type SortBy =
  | 'number-asc'
  | 'number-desc'
  | 'difficulty-desc'
  | 'difficulty-asc'
  | 'recent-appearance';

type PanelMode = 'actions' | 'options';

const SORT_OPTIONS: SortBy[] = ['number-asc', 'number-desc', 'difficulty-asc', 'difficulty-desc', 'recent-appearance'];

function isSortBy(value: string | null): value is SortBy {
  return value !== null && SORT_OPTIONS.includes(value as SortBy);
}

function ActionSheetIcon({ kind, isCaught = false }: { kind: 'owned' | 'shiny' | 'open' | 'options'; isCaught?: boolean }) {
  if (kind === 'owned') {
    return (
      <PokeballIcon className={isCaught ? 'h-[18px] w-[18px] opacity-45 grayscale' : 'h-[18px] w-[18px]'} />
    );
  }

  if (kind === 'shiny') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3 14.8 9.2 21 12l-6.2 2.8L12 21l-2.8-6.2L3 12l6.2-2.8L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (kind === 'open') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M14 5h5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 14 19 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
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
  if (typeof item.daysSinceLastUsable === 'number') return item.daysSinceLastUsable;
  if (!item.lastUsableDate || !latestPuzzleDate) return null;
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((parseDay(latestPuzzleDate) - parseDay(item.lastUsableDate)) / millisecondsPerDay);
}

interface SuggestionsPanelProps {
  selectedCell: [number, number] | null;
  possiblePokemon: Pokemon[];
  currentPokemon?: Pokemon | null;
  rowConstraint?: Constraint | null;
  colConstraint?: Constraint | null;
  ownedPokemonKeyIds?: Set<number>;
  shinyPokemonKeyIds?: Set<number>;
  showOwnershipState?: boolean;
  hideOwnedOptions?: boolean;
  anchorElement?: HTMLElement | null;
  onClose?: () => void;
  onSelect: (pokemon: Pokemon) => void;
  onMarkOwned?: (pokemon: Pokemon) => void;
  onMarkShiny?: (pokemon: Pokemon) => void;
}

export function SuggestionsPanel({
  selectedCell,
  possiblePokemon,
  currentPokemon = null,
  rowConstraint = null,
  colConstraint = null,
  ownedPokemonKeyIds,
  shinyPokemonKeyIds,
  showOwnershipState = true,
  hideOwnedOptions = false,
  anchorElement: _anchorElement,
  onClose,
  onSelect,
  onMarkOwned,
  onMarkShiny,
}: SuggestionsPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [daysSinceLastUsableByKeyId, setDaysSinceLastUsableByKeyId] = useState<Map<number, number | null>>(
    new Map(),
  );
  const [sortBy, setSortBy] = useState<SortBy>(() => {
    if (typeof window !== 'undefined') {
      const savedSort = localStorage.getItem('pokedoku-sort');
      return isSortBy(savedSort) ? savedSort : 'difficulty-asc';
    }
    return 'difficulty-asc';
  });
  const currentPokemonKeyId = currentPokemon ? getPokemonKeyId(currentPokemon) : null;
  const hasCurrentPokemon = currentPokemonKeyId !== null;
  const [panelMode, setPanelMode] = useState<PanelMode>(hasCurrentPokemon ? 'actions' : 'options');
  const isCurrentPokemonOwned = currentPokemonKeyId !== null && (ownedPokemonKeyIds?.has(currentPokemonKeyId) ?? false);
  const isCurrentPokemonShiny = currentPokemonKeyId !== null && (shinyPokemonKeyIds?.has(currentPokemonKeyId) ?? false);
  const isActionsMode = panelMode === 'actions' && currentPokemon;
  const rowParsed = constraintToParsedCategory(rowConstraint);
  const colParsed = constraintToParsedCategory(colConstraint);

  function handleSortChange(newSort: SortBy) {
    setSortBy(newSort);
    const column = newSort.startsWith('number')
      ? 'number'
      : newSort.startsWith('difficulty')
        ? 'difficulty'
        : 'recent-appearance';
    trackEvent('sort_update', {
      location: 'suggestions',
      source: 'suggestions',
      target: column,
      value: newSort,
    });
  }

  useEffect(() => {
    localStorage.setItem('pokedoku-sort', sortBy);
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
        console.error('Failed to load Pokemon recent appearance:', err);
      });
  }, []);

  const sortedPokemon = useMemo(() => {
    const copy = [...possiblePokemon];
    if (sortBy === 'number-asc') {
      return copy.sort((a, b) => a.id - b.id);
    } else if (sortBy === 'number-desc') {
      return copy.sort((a, b) => b.id - a.id);
    } else if (sortBy === 'difficulty-asc') {
      return copy.sort((a, b) => {
        const aPercentile = a.dexDifficultyPercentile ?? 0;
        const bPercentile = b.dexDifficultyPercentile ?? 0;
        return bPercentile - aPercentile;
      });
    } else if (sortBy === 'difficulty-desc') {
      return copy.sort((a, b) => {
        const aPercentile = a.dexDifficultyPercentile ?? 0;
        const bPercentile = b.dexDifficultyPercentile ?? 0;
        return aPercentile - bPercentile;
      });
    } else if (sortBy === 'recent-appearance') {
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

    if (hideOwnedOptions) {
      return sortedPokemon.filter((pokemon) => !ownedPokemonKeyIds.has(getPokemonKeyId(pokemon)));
    }

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
  }, [currentPokemon, hideOwnedOptions, ownedPokemonKeyIds, showOwnershipState, sortedPokemon]);

  const visiblePokemon = useMemo(() => displayedPokemon, [displayedPokemon]);

  const optionsCounts = useMemo(() => {
    if (!ownedPokemonKeyIds || !showOwnershipState) {
      return { total: visiblePokemon.length, owned: 0, unowned: visiblePokemon.length };
    }

    let owned = 0;
    for (const pokemon of visiblePokemon) {
      if (ownedPokemonKeyIds.has(getPokemonKeyId(pokemon))) owned += 1;
    }

    return {
      total: visiblePokemon.length,
      owned,
      unowned: visiblePokemon.length - owned,
    };
  }, [ownedPokemonKeyIds, showOwnershipState, visiblePokemon]);

  const headerCounts = useMemo(() => {
    if (!ownedPokemonKeyIds || !showOwnershipState) {
      return { total: possiblePokemon.length, owned: 0, unowned: possiblePokemon.length };
    }

    let owned = 0;
    for (const pokemon of possiblePokemon) {
      if (ownedPokemonKeyIds.has(getPokemonKeyId(pokemon))) owned += 1;
    }

    return {
      total: possiblePokemon.length,
      owned,
      unowned: possiblePokemon.length - owned,
    };
  }, [ownedPokemonKeyIds, possiblePokemon, showOwnershipState]);

  const optionsSummary = useMemo(() => {
    if (!showOwnershipState || !ownedPokemonKeyIds) return null;

    const newCount = possiblePokemon.filter((pokemon) => !ownedPokemonKeyIds.has(getPokemonKeyId(pokemon))).length;
    const ownedCount = possiblePokemon.filter((pokemon) => ownedPokemonKeyIds.has(getPokemonKeyId(pokemon))).length;

    return { newCount, ownedCount };
  }, [ownedPokemonKeyIds, possiblePokemon, showOwnershipState]);

  if (!selectedCell) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/10 p-3 backdrop-blur-[2px] md:items-center" onClick={onClose}>
      <div
        className={`relative flex w-full max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden border border-[var(--border)] bg-[var(--bg)] shadow-[0_18px_40px_rgba(15,23,42,0.28)] md:h-[660px] md:w-[418px] md:max-w-full md:rounded-xl md:p-4 ${
          isActionsMode
            ? 'rounded-t-3xl rounded-b-xl px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:max-h-none'
            : 'max-h-[72svh] rounded-t-3xl rounded-b-xl px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:max-h-none'
        }`}
        ref={containerRef}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-[var(--border)] md:hidden" aria-hidden="true" />
        <div className="-mx-4 -mt-3 shrink-0 border-b border-[var(--border)] bg-[var(--bg)] px-4 pt-3 pb-2.5 md:-mx-4 md:-mt-4 md:pt-4 md:pb-3">
          <div className="flex flex-col gap-1.5 md:gap-2">
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex min-w-0 flex-col text-left">
                <span className="text-base font-semibold text-[var(--text-h)] md:text-[1.05rem]">{headerCounts.total} Pokemon</span>
                {showOwnershipState ? (
                  <span className="mt-0.5 text-xs font-medium text-[var(--text)] md:text-xs">
                    {headerCounts.unowned} unowned, {headerCounts.owned} owned
                  </span>
                ) : null}
              </span>
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] transition-colors hover:bg-[var(--code-bg)] md:h-8 md:w-8"
                aria-label="Close suggestions"
                onClick={onClose}
              >
                <span aria-hidden="true" className="text-sm leading-none md:text-base">×</span>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {rowParsed ? <CategoryBadgeLink parsed={rowParsed} href={null} compact /> : <span className="text-xs text-[var(--text)]">Any</span>}
              <span className="text-[var(--text)]">+</span>
              {colParsed ? <CategoryBadgeLink parsed={colParsed} href={null} compact /> : <span className="text-xs text-[var(--text)]">Any</span>}
            </div>
            <label className={`flex max-w-full items-center gap-1 self-start text-[var(--text)] opacity-80 ${panelMode === 'actions' ? 'md:hidden' : ''}`}>
              <span className="text-[0.8rem]" aria-hidden="true">
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
                  className="max-w-[230px] cursor-pointer appearance-none rounded-md border border-[var(--border)] bg-[var(--code-bg)] py-1 pl-2 pr-7 text-xs text-[var(--text)] max-[768px]:max-w-[210px]"
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
            {panelMode === 'options' ? (
              <div className="flex max-w-full items-center gap-1 self-start text-[var(--text)] opacity-80">
                <span className="text-xs font-medium text-[var(--text)]">
                  {optionsCounts.total} Pokemon{showOwnershipState ? `, ${optionsCounts.unowned} unowned, ${optionsCounts.owned} owned` : ''}
                </span>
              </div>
            ) : null}
          </div>
        </div>
        <div className={`min-h-0 pt-2.5 md:flex-1 md:overflow-y-auto md:pt-3 ${panelMode === 'options' ? 'flex-1 overflow-y-auto' : 'overflow-visible'}`}>
          {panelMode === 'actions' && currentPokemon ? (
            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg)] md:rounded-xl">
              <button
                type="button"
                className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-[var(--text-h)] transition hover:bg-[var(--accent-bg)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!onMarkOwned}
                onClick={() => onMarkOwned?.(currentPokemon)}
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--code-bg)] text-[var(--text)]">
                  <ActionSheetIcon kind="owned" isCaught={isCurrentPokemonOwned} />
                </span>
                <span>{isCurrentPokemonOwned ? 'Mark unowned' : 'Mark as owned'}</span>
              </button>
              <div className="mx-4 h-px bg-[var(--border)]" aria-hidden="true" />
              <button
                type="button"
                className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-[var(--text-h)] transition hover:bg-[var(--accent-bg)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!onMarkShiny || isCurrentPokemonShiny}
                onClick={() => onMarkShiny?.(currentPokemon)}
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 [html[data-theme='dark']_&]:bg-amber-900/40 [html[data-theme='dark']_&]:text-amber-300">
                  <ActionSheetIcon kind="shiny" />
                </span>
                <span>Mark as shiny</span>
              </button>
              <div className="mx-4 h-px bg-[var(--border)]" aria-hidden="true" />
              <a
                href={`${import.meta.env.BASE_URL}pokemon/${slugify(currentPokemon.name)}-${currentPokemon.formId ?? currentPokemon.id}/`}
                className="flex min-h-12 items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-[var(--text-h)] no-underline transition hover:bg-[var(--accent-bg)]"
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--code-bg)] text-[var(--text)]">
                  <ActionSheetIcon kind="open" />
                </span>
                <span>Open {currentPokemon.name}</span>
              </a>
              <div className="mx-4 h-px bg-[var(--border)]" aria-hidden="true" />
              <button
                type="button"
                className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-[var(--text-h)] transition hover:bg-[var(--accent-bg)]"
                onClick={() => setPanelMode('options')}
              >
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--code-bg)] text-[var(--text)]">
                  <ActionSheetIcon kind="options" />
                </span>
                <span className="flex flex-col">
                  <span>Show all options</span>
                  {optionsSummary ? (
                    <span className="text-xs font-medium text-[var(--text)]">
                      ({optionsSummary.newCount} new, {optionsSummary.ownedCount} owned)
                    </span>
                  ) : null}
                </span>
              </button>
            </div>
          ) : null}

          {panelMode === 'options' ? (
          <div className="flex flex-col gap-2">
          {currentPokemon ? (
            <button
              type="button"
              className="inline-flex min-h-12 items-center gap-2 self-start rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm font-semibold text-[var(--text-h)] transition hover:border-[var(--accent-border)] hover:bg-[var(--accent-bg)]"
              onClick={() => setPanelMode('actions')}
            >
              <span aria-hidden="true" className="text-base leading-none">←</span>
              <span>Back</span>
            </button>
          ) : null}
          {visiblePokemon.length > 0 ? (
            visiblePokemon.map((p) => {
              const pokemonKeyId = getPokemonKeyId(p);
              const isOwned = showOwnershipState && (ownedPokemonKeyIds?.has(pokemonKeyId) ?? false);
              const isShiny = showOwnershipState && (shinyPokemonKeyIds?.has(pokemonKeyId) ?? false);

              return (
              <button
                key={`${p.id}-${p.name}`}
                className={`flex cursor-pointer flex-row gap-0 rounded-lg border p-0 text-left transition-all hover:border-[var(--accent-border)] hover:bg-[var(--accent-bg)] ${isShiny ? "border-amber-300 bg-amber-200 [html[data-theme='dark']_&]:border-amber-700 [html[data-theme='dark']_&]:bg-amber-900/35" : isOwned ? "border-[var(--border)] bg-[var(--code-bg)]" : "border-[var(--border)] bg-[var(--bg)]"}`}
                onClick={() => {
                  trackEvent('pokemon_select', {
                    location: 'suggestions',
                    source: 'suggestions',
                    target: 'pokemon',
                    value: p.name,
                    pokemon_id: p.id,
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
          ) : null}
        </div>
        {panelMode === 'options' && visiblePokemon.length >= 5 ? (
          <div className="pointer-events-none absolute bottom-2 left-1/2 z-[1] flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)]/85 shadow-sm backdrop-blur-sm">
            <span className="flex h-full w-full items-center justify-center" title="Scroll for more">
              ▼
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
