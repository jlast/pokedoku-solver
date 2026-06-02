import { useEffect, useMemo, useState } from 'react';
import type { Pokemon } from '@pokedoku-helper/shared-types';
import { trackEvent } from '../../../../lib/browser/analytics';
import { matchesConstraint, type Constraint } from '../../../../lib/shared/filters';
import { getRemoteSettings, getRemoteUserDex, patchRemoteSettings, patchRemoteUserDex, type UserDexPayload } from '@pokedoku-helper/user-api-client';
import { Grid } from '../components/Grid';
import { SuggestionsPanel } from '../components/SuggestionsPanel';
import { TodayBoardSuggestions } from '../components/TodayBoardSuggestions';
import { ActionButton } from '../components/shared/ActionButton';
import { ActionLink } from '../components/shared/ActionLink';
import { getSessionUserProfile, getValidSessionIdToken } from '../../lib/cognitoAuth';
import { getPokemonKeyId } from '../lib/pokemonGrid';
import {
  buildPersonalizedRemainingGroupScoreMap,
  buildFallbackOwnedCells,
  buildSuggestedCells,
  buildTextualSuggestionEntries,
  createEmptyKeyGrid,
  createEmptyPokemonGrid,
} from '../lib/todayBoard';

type RevealState = 'hidden' | 'hint' | 'revealed';

function getCellKey(row: number, col: number): string {
  return `${row}-${col}`;
}

function createInitialRevealStates(size: number): Record<string, RevealState> {
  const states: Record<string, RevealState> = {};

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      states[getCellKey(row, col)] = 'hidden';
    }
  }

  return states;
}

export interface TodayPuzzle {
  date: string;
  type: string;
  bonus?: boolean;
  size?: number;
  rowConstraints: Constraint[];
  colConstraints: Constraint[];
}

interface GridState {
  cells: (Pokemon | null)[][];
  rowConstraints: (Constraint | null)[];
  colConstraints: (Constraint | null)[];
  selectedCell: [number, number] | null;
}

interface UndoMarkOwnedState {
  previousUserDex: UserDexPayload;
  addedCount: number;
}

interface LoadedTodayBoardUserState {
  userDex: UserDexPayload | null;
  myPokedexFilter: boolean | null;
  spoilerModeEnabled: boolean | null;
}

const TODAY_BOARD_RECOMMENDATION_FAQ = [
  {
    question: 'Why are these not always the highest-difficulty picks?',
    answer:
      'For logged-in users with Suggest new Pokémon enabled, these recommendations are optimized for your remaining Pokedex, not just raw rarity. A lower-difficulty Pokemon can be the better pick if it preserves stronger future coverage across the category combinations you still need.',
  },
  {
    question: 'What makes a pick the best one?',
    answer:
      'We check the valid category-combination groups each remaining Pokemon belongs to using only types, regions, evolution, and categories. Then we look at how many unowned Pokemon are left in each of those groups and prefer answers whose weakest remaining group is still relatively strong.',
  },
  {
    question: 'Does dex difficulty still matter?',
    answer:
      'Yes. Dex difficulty is still used as a tie-breaker when two Pokemon are equally good for your remaining Pokedex coverage. It just is not the main ranking rule in this personalized mode.',
  },
  {
    question: 'Do moves and abilities affect these recommendations?',
    answer:
      'No. This scoring only uses types, regions, evolution, and categories. Moves and abilities are intentionally excluded from the personalized coverage score.',
  },
  {
    question: 'Why can recommendations change after I mark Pokemon as owned?',
    answer:
      'Because your remaining Pokedex changed. As your owned list changes, the system recalculates which category-combination groups are still deep and which ones are getting thin, so a different answer can become the most strategic pick.',
  },
] as const;

function getApiBaseUrl(): string | null {
  const baseUrl = import.meta.env.PUBLIC_USER_DEX_API_BASE_URL;
  if (!baseUrl || typeof baseUrl !== 'string') return null;
  return baseUrl;
}

async function loadTodayBoardUserState(token: string, apiBaseUrl: string): Promise<LoadedTodayBoardUserState> {
  const [userDex, settings] = await Promise.all([
    getRemoteUserDex({ token, apiBaseUrl }),
    getRemoteSettings({ token, apiBaseUrl }),
  ]);

  return {
    userDex,
    myPokedexFilter: settings?.myPokedexFilter ?? null,
    spoilerModeEnabled: settings ? !settings.preventSpoilerMode : null,
  };
}

async function saveCaughtPokemon(token: string, apiBaseUrl: string, payload: UserDexPayload): Promise<boolean> {
  return Boolean(
    await patchRemoteUserDex({
      token,
      apiBaseUrl,
      payload,
    }),
  );
}

async function saveMyPokedexFilter(token: string, apiBaseUrl: string, myPokedexFilter: boolean): Promise<boolean> {
  return Boolean(
    await patchRemoteSettings({
      token,
      apiBaseUrl,
      patch: { myPokedexFilter },
    }),
  );
}

async function saveSpoilerModePreference(token: string, apiBaseUrl: string, spoilerModeEnabled: boolean): Promise<boolean> {
  return Boolean(
    await patchRemoteSettings({
      token,
      apiBaseUrl,
      patch: { preventSpoilerMode: !spoilerModeEnabled },
    }),
  );
}

export function TodayBoard({ puzzle }: { puzzle: TodayPuzzle }) {
  const isLoggedIn = typeof window !== 'undefined' && Boolean(getSessionUserProfile());
  const gridSize = puzzle.rowConstraints.length;
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [grid, setGrid] = useState<GridState>(() => ({
    cells: createEmptyPokemonGrid(gridSize),
    rowConstraints: [...puzzle.rowConstraints],
    colConstraints: [...puzzle.colConstraints],
    selectedCell: null,
  }));
  const [suggestedPokemonKeys, setSuggestedPokemonKeys] = useState<(string | null)[][]>(() => createEmptyKeyGrid(gridSize));
  const [showMissingOnly, setShowMissingOnly] = useState<boolean>(() => isLoggedIn);
  const [isSavingFilterPreference, setIsSavingFilterPreference] = useState(false);
  const [isSavingSpoilerPreference, setIsSavingSpoilerPreference] = useState(false);
  const [isMarkingOwned, setIsMarkingOwned] = useState(false);
  const [isUndoingMarkOwned, setIsUndoingMarkOwned] = useState(false);
  const [caughtSet, setCaughtSet] = useState<Set<number>>(new Set<number>());
  const [remoteUserDex, setRemoteUserDex] = useState<UserDexPayload | null>(null);
  const [undoMarkOwnedState, setUndoMarkOwnedState] = useState<UndoMarkOwnedState | null>(null);
  const [selectedCellAnchorElement, setSelectedCellAnchorElement] = useState<HTMLDivElement | null>(null);
  const [spoilerModeEnabled, setSpoilerModeEnabled] = useState(false);
  const [revealStates, setRevealStates] = useState<Record<string, RevealState>>(() => createInitialRevealStates(gridSize));

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/pokemon.json`)
      .then((res) => res.json())
      .then((data) => {
        setPokemon(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load Pokemon:', err);
        setLoading(false);
      });
  }, [puzzle.colConstraints, puzzle.rowConstraints]);

  useEffect(() => {
    if (!isLoggedIn) return;

    let isCancelled = false;
    void (async () => {
      const token = await getValidSessionIdToken();
      const apiBaseUrl = getApiBaseUrl();
      if (!token || !apiBaseUrl) return;

      try {
        const { userDex, myPokedexFilter, spoilerModeEnabled } = await loadTodayBoardUserState(token, apiBaseUrl);
        if (isCancelled) return;

        if (userDex) {
          setCaughtSet(new Set(userDex.caughtPokemonKeyIds));
          setRemoteUserDex(userDex);
          setUndoMarkOwnedState(null);
        }
        if (myPokedexFilter !== null) {
          setShowMissingOnly(myPokedexFilter);
        }
        if (spoilerModeEnabled !== null) {
          setSpoilerModeEnabled(spoilerModeEnabled);
        }
      } catch {}
    })();

    return () => {
      isCancelled = true;
    };
  }, [isLoggedIn]);

  const pokemonPool = useMemo(() => {
    if (!showMissingOnly) return pokemon;
    return pokemon.filter((entry) => !caughtSet.has(getPokemonKeyId(entry)));
  }, [caughtSet, pokemon, showMissingOnly]);

  const personalizedRemainingGroupScoreByKeyId = useMemo(() => {
    if (!isLoggedIn || !showMissingOnly || pokemon.length === 0 || pokemonPool.length === 0) {
      return undefined;
    }

    return buildPersonalizedRemainingGroupScoreMap({
      pokemon,
      remainingPokemon: pokemonPool,
    });
  }, [isLoggedIn, pokemon, pokemonPool, showMissingOnly]);

  useEffect(() => {
    if (pokemonPool.length === 0) return;

    const { cells, suggestedKeys } = buildSuggestedCells(
      pokemonPool,
      puzzle.rowConstraints,
      puzzle.colConstraints,
      personalizedRemainingGroupScoreByKeyId,
    );
    const timer = window.setTimeout(() => {
      setSuggestedPokemonKeys(suggestedKeys);
      setGrid((prev) => ({ ...prev, cells }));
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [personalizedRemainingGroupScoreByKeyId, pokemonPool, puzzle.colConstraints, puzzle.rowConstraints]);

  const possiblePokemon = useMemo(() => {
    const result: Pokemon[][][] = Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize }, () => [] as Pokemon[]),
    );

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (grid.cells[row][col] !== null) {
          result[row][col] = [grid.cells[row][col]!];
          continue;
        }

        result[row][col] = pokemonPool.filter((entry) => {
          if (!matchesConstraint(entry, grid.rowConstraints[row])) return false;
          if (!matchesConstraint(entry, grid.colConstraints[col])) return false;
          return true;
        });
      }
    }

    return result;
  }, [grid, gridSize, pokemonPool]);

  const fallbackOwnedCells = useMemo(() => {
    if (!isLoggedIn || !showMissingOnly || caughtSet.size === 0) return createEmptyPokemonGrid(gridSize);

    return buildFallbackOwnedCells({
      pokemon,
      gridCells: grid.cells,
      rowConstraints: grid.rowConstraints,
      colConstraints: grid.colConstraints,
      caughtSet,
      shinyPokemonKeyIds: new Set(remoteUserDex?.shinyPokemonKeyIds ?? []),
    });
  }, [caughtSet, grid.cells, grid.colConstraints, grid.rowConstraints, gridSize, isLoggedIn, pokemon, remoteUserDex, showMissingOnly]);

  const swapOptionCounts = useMemo(() => {
    const result: number[][] = Array.from({ length: gridSize }, () => Array.from({ length: gridSize }, () => 0));

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        result[row][col] = pokemonPool.filter(
          (entry) => matchesConstraint(entry, grid.rowConstraints[row]) && matchesConstraint(entry, grid.colConstraints[col]),
        ).length;
      }
    }

    return result;
  }, [grid.colConstraints, grid.rowConstraints, gridSize, pokemonPool]);

  const totalSwapOptionCounts = useMemo(() => {
    const result: number[][] = Array.from({ length: gridSize }, () => Array.from({ length: gridSize }, () => 0));

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        result[row][col] = pokemon.filter(
          (entry) => matchesConstraint(entry, grid.rowConstraints[row]) && matchesConstraint(entry, grid.colConstraints[col]),
        ).length;
      }
    }

    return result;
  }, [grid.colConstraints, grid.rowConstraints, gridSize, pokemon]);

  function handleCellClick(row: number, col: number, anchorElement?: HTMLDivElement | null) {
    const cellKey = getCellKey(row, col);
    const revealState = revealStates[cellKey] ?? 'revealed';
    const hasHiddenAnswer = spoilerModeEnabled && revealState !== 'revealed' && Boolean(grid.cells[row][col] ?? fallbackOwnedCells[row][col]);

    setGrid((prev) => ({ ...prev, selectedCell: [row, col] }));
    setSelectedCellAnchorElement(anchorElement ?? null);

    if (hasHiddenAnswer) {
      setRevealStates((prev) => ({
        ...prev,
        [cellKey]: prev[cellKey] === 'hidden' ? 'hint' : 'revealed',
      }));
    }
  }

  function advanceReveal(row: number, col: number) {
    const cellKey = getCellKey(row, col);
    setRevealStates((prev) => ({
      ...prev,
      [cellKey]: prev[cellKey] === 'hidden' ? 'hint' : 'revealed',
    }));
  }

  function handlePokemonSelect(selectedPokemon: Pokemon) {
    if (!grid.selectedCell) return;

    const [row, col] = grid.selectedCell;
    setGrid((prev) => ({
      ...prev,
      cells: prev.cells.map((currentRow, currentRowIndex) =>
        currentRowIndex === row
          ? currentRow.map((cellValue, currentColIndex) => (currentColIndex === col ? selectedPokemon : cellValue))
          : currentRow,
      ),
      selectedCell: null,
    }));
  }

  function clearCells() {
    trackEvent('click_clear_all');
    setGrid((prev) => ({
      ...prev,
      cells: createEmptyPokemonGrid(gridSize),
      selectedCell: null,
    }));
  }

  async function markOwned() {
    if (isMarkingOwned || isUndoingMarkOwned) return;

    const ownedIds = grid.cells
      .flat()
      .filter((cell): cell is Pokemon => Boolean(cell))
      .map((cell) => getPokemonKeyId(cell));

    if (ownedIds.length === 0 || !remoteUserDex) return;

    setIsMarkingOwned(true);
    try {
      const token = await getValidSessionIdToken();
      const apiBaseUrl = getApiBaseUrl();
      if (!token || !apiBaseUrl) return;

      const mergedSet = new Set(caughtSet);
      for (const id of ownedIds) mergedSet.add(id);

      const nextPayload: UserDexPayload = {
        caughtPokemonKeyIds: Array.from(mergedSet).sort((a, b) => a - b),
        shinyPokemonKeyIds: remoteUserDex.shinyPokemonKeyIds,
        unlockedPrestigeLevelIndex: remoteUserDex.unlockedPrestigeLevelIndex,
        updatedAt: new Date().toISOString(),
      };

      const didSave = await saveCaughtPokemon(token, apiBaseUrl, nextPayload);
      if (!didSave) return;

      setCaughtSet(mergedSet);
      setRemoteUserDex(nextPayload);
      setUndoMarkOwnedState({
        previousUserDex: remoteUserDex,
        addedCount: ownedIds.filter((id) => !caughtSet.has(id)).length,
      });
      trackEvent('click_mark_all_completed', { count: ownedIds.length.toString() });
    } finally {
      setIsMarkingOwned(false);
    }
  }

  async function undoMarkOwned() {
    if (!undoMarkOwnedState || !remoteUserDex || isUndoingMarkOwned || isMarkingOwned) return;

    setIsUndoingMarkOwned(true);
    try {
      const token = await getValidSessionIdToken();
      const apiBaseUrl = getApiBaseUrl();
      if (!token || !apiBaseUrl) return;

      const didSave = await saveCaughtPokemon(token, apiBaseUrl, undoMarkOwnedState.previousUserDex);
      if (!didSave) return;

      setCaughtSet(new Set(undoMarkOwnedState.previousUserDex.caughtPokemonKeyIds));
      setRemoteUserDex(undoMarkOwnedState.previousUserDex);
      setUndoMarkOwnedState(null);
      trackEvent('click_undo_mark_owned', { count: undoMarkOwnedState.addedCount.toString() });
    } finally {
      setIsUndoingMarkOwned(false);
    }
  }

  async function saveSelectedPokemonDexState(pokemon: Pokemon, options: { owned?: boolean; shiny?: boolean }) {
    if (!remoteUserDex || isMarkingOwned || isUndoingMarkOwned) return;

    const pokemonKeyId = getPokemonKeyId(pokemon);
    const nextCaughtSet = new Set(caughtSet);
    const nextShinySet = new Set(remoteUserDex.shinyPokemonKeyIds);

    if (options.owned === true) {
      nextCaughtSet.add(pokemonKeyId);
    }

    if (options.owned === false) {
      nextCaughtSet.delete(pokemonKeyId);
      nextShinySet.delete(pokemonKeyId);
    }

    if (options.shiny) {
      nextCaughtSet.add(pokemonKeyId);
      nextShinySet.add(pokemonKeyId);
    }

    const nextPayload: UserDexPayload = {
      caughtPokemonKeyIds: Array.from(nextCaughtSet).sort((a, b) => a - b),
      shinyPokemonKeyIds: Array.from(nextShinySet).sort((a, b) => a - b),
      unlockedPrestigeLevelIndex: remoteUserDex.unlockedPrestigeLevelIndex,
      updatedAt: new Date().toISOString(),
    };

    setCaughtSet(nextCaughtSet);
    setRemoteUserDex(nextPayload);
    setUndoMarkOwnedState(null);

    const token = await getValidSessionIdToken();
    const apiBaseUrl = getApiBaseUrl();
    if (!token || !apiBaseUrl) {
      setCaughtSet(new Set(remoteUserDex.caughtPokemonKeyIds));
      setRemoteUserDex(remoteUserDex);
      return;
    }

    const didSave = await saveCaughtPokemon(token, apiBaseUrl, nextPayload);
    if (!didSave) {
      setCaughtSet(new Set(remoteUserDex.caughtPokemonKeyIds));
      setRemoteUserDex(remoteUserDex);
      return;
    }

    trackEvent('update_grid_cell_dex_state', {
      pokemon_key_id: pokemonKeyId.toString(),
      caught: nextCaughtSet.has(pokemonKeyId) ? 'true' : 'false',
      shiny: nextShinySet.has(pokemonKeyId) ? 'true' : 'false',
    });
  }

  async function markSelectedPokemonOwned(pokemon: Pokemon) {
    await saveSelectedPokemonDexState(pokemon, { owned: !caughtSet.has(getPokemonKeyId(pokemon)) });
  }

  async function markSelectedPokemonShiny(pokemon: Pokemon) {
    await saveSelectedPokemonDexState(pokemon, { shiny: true });
  }

  const hasGridData = grid.cells.some((row) => row.some((cell) => cell !== null));

  async function toggleMyPokedexFilter() {
    const nextValue = !showMissingOnly;
    setShowMissingOnly(nextValue);

    const token = await getValidSessionIdToken();
    const apiBaseUrl = getApiBaseUrl();
    if (!token || !apiBaseUrl) return;

    setIsSavingFilterPreference(true);
    const didSave = await saveMyPokedexFilter(token, apiBaseUrl, nextValue);
    setIsSavingFilterPreference(false);

    if (!didSave) {
      setShowMissingOnly(!nextValue);
    }
  }

  async function toggleSpoilerMode() {
    const nextValue = !spoilerModeEnabled;
    setSpoilerModeEnabled(nextValue);
    trackEvent('toggle_spoiler_mode', { enabled: nextValue ? 'true' : 'false' });

    if (!isLoggedIn) return;

    const token = await getValidSessionIdToken();
    const apiBaseUrl = getApiBaseUrl();
    if (!token || !apiBaseUrl) return;

    setIsSavingSpoilerPreference(true);
    try {
      const didSave = await saveSpoilerModePreference(token, apiBaseUrl, nextValue);
      if (!didSave) {
        setSpoilerModeEnabled(!nextValue);
      }
    } finally {
      setIsSavingSpoilerPreference(false);
    }
  }

  const selectedCellPossible = useMemo(() => {
    if (!grid.selectedCell) return [];
    const [row, col] = grid.selectedCell;
    return pokemon.filter(
      (entry) => matchesConstraint(entry, grid.rowConstraints[row]) && matchesConstraint(entry, grid.colConstraints[col]),
    );
  }, [grid.colConstraints, grid.rowConstraints, grid.selectedCell, pokemon]);

  const selectedCellDisplayPokemon = useMemo(() => {
    if (!grid.selectedCell) return null;
    const [row, col] = grid.selectedCell;
    return grid.cells[row][col] ?? fallbackOwnedCells[row][col] ?? null;
  }, [fallbackOwnedCells, grid.cells, grid.selectedCell]);

  const selectedCellHasPlacedPokemon = useMemo(() => {
    if (!grid.selectedCell) return false;
    const [row, col] = grid.selectedCell;
    return grid.cells[row][col] !== null;
  }, [grid.cells, grid.selectedCell]);

  const textualSuggestions = useMemo(() => {
    return buildTextualSuggestionEntries({
      gridCells: grid.cells,
      rowConstraints: grid.rowConstraints,
      colConstraints: grid.colConstraints,
      fallbackOwnedCells,
    });
  }, [fallbackOwnedCells, grid.cells, grid.colConstraints, grid.rowConstraints]);

  const canShowSuggestionsPanel = useMemo(() => {
    if (!grid.selectedCell) return false;
    if (!spoilerModeEnabled) return true;
    const [row, col] = grid.selectedCell;
    return (revealStates[getCellKey(row, col)] ?? 'revealed') === 'revealed';
  }, [grid.selectedCell, revealStates, spoilerModeEnabled]);

  if (loading) {
    return <div className="min-h-screen p-5 text-center"><p>Loading Pokemon data...</p></div>;
  }

  return (
    <div className="flex flex-col items-center">
      {isLoggedIn ? (
        <section className="mb-3 w-full max-w-[500px] rounded-xl border border-[var(--border)] bg-[var(--code-bg)] p-3 text-left">
          <div className="flex flex-col items-center gap-3 text-center">
            <div>
              <p className="m-0 text-sm font-semibold text-[var(--text-h)]">My Pokedex &amp; Answer Filters</p>
              <p className="m-0 text-xs text-[var(--text)]">Control which answers you see and when you see them.</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="grid grid-cols-[190px_auto] items-center justify-center gap-3">
                <div className="text-left">
                  <p className="m-0 text-sm font-medium text-[var(--text-h)]">Suggest new Pokémon</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showMissingOnly}
                  onClick={() => {
                    void toggleMyPokedexFilter();
                  }}
                  disabled={isSavingFilterPreference}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors ${
                    showMissingOnly ? 'border-emerald-500 bg-emerald-500' : 'border-[var(--border)] bg-slate-300'
                  } ${isSavingFilterPreference ? 'opacity-70' : ''}`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-[var(--bg)] shadow transition-transform ${
                      showMissingOnly ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="grid grid-cols-[190px_auto] items-center justify-center gap-3">
                <div className="text-left">
                  <p className="m-0 text-sm font-medium text-[var(--text-h)]">Avoid spoilers</p>

                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={spoilerModeEnabled}
                  onClick={() => {
                    void toggleSpoilerMode();
                  }}
                  disabled={isSavingSpoilerPreference}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors ${
                    spoilerModeEnabled ? 'border-emerald-500 bg-emerald-500' : 'border-[var(--border)] bg-slate-300'
                  } ${isSavingSpoilerPreference ? 'opacity-70' : ''}`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-[var(--bg)] shadow transition-transform ${
                      spoilerModeEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
          {showMissingOnly ? (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <ActionButton
                onClick={markOwned}
                variant="success"
                disabled={!hasGridData || !remoteUserDex || isMarkingOwned || isUndoingMarkOwned}
              >
                {isMarkingOwned ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="animate-spin">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                      <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Saving in My Pokedex...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Save picks in My Pokedex
                  </>
                )}
              </ActionButton>
              <ActionButton
                onClick={() => {
                  void undoMarkOwned();
                }}
                variant="secondary"
                disabled={!undoMarkOwnedState || isUndoingMarkOwned || isMarkingOwned}
              >
                {isUndoingMarkOwned ? 'Undoing...' : 'Undo'}
              </ActionButton>
            </div>
          ) : null}
        </section>
      ) : (
        <>
          <section className="mb-3 w-full max-w-[700px] rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3 text-left shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-rose-200 bg-rose-50 shadow-sm [html[data-theme='dark']_&]:border-rose-900/60 [html[data-theme='dark']_&]:bg-rose-950/30">
                    <img
                      src={`${import.meta.env.BASE_URL}images/content/trainer.png`}
                      alt=""
                      className="h-8 w-8 object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-sm font-semibold text-[var(--text-h)]">Complete your Pokedex faster</p>
                    <p className="m-0 mt-1 text-sm leading-5 text-[var(--text)]">
                      Hide Pokemon you already own and focus on answers that help complete your collection.
                      <span className="hidden md:inline"> Save today&apos;s picks and track your progress across future puzzles.</span>
                    </p>
                    <div className="mt-2.5 flex flex-col gap-1.5 text-xs text-[var(--text)]">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 [html[data-theme='dark']_&]:text-emerald-400">✓</span>
                        <span>Hide owned Pokemon</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 [html[data-theme='dark']_&]:text-emerald-400">✓</span>
                        <span>Highlight missing entries</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 [html[data-theme='dark']_&]:text-emerald-400">✓</span>
                        <span>Save progress across puzzles</span>
                      </div>
                    </div>
                    <div className="mt-3 md:hidden">
                      <ActionLink
                        href={`${import.meta.env.BASE_URL}login/`}
                        variant="secondary"
                        className="border-rose-600 bg-rose-600 text-white hover:border-rose-500 hover:bg-rose-500 [html[data-theme='dark']_&]:border-rose-500 [html[data-theme='dark']_&]:bg-rose-500 [html[data-theme='dark']_&]:text-white [html[data-theme='dark']_&]:hover:border-rose-400 [html[data-theme='dark']_&]:hover:bg-rose-400"
                        onClick={() => trackEvent('click_navigate', { url: 'login/', from: 'today_suggestions' })}
                      >
                        Connect My Pokedex
                      </ActionLink>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden shrink-0 flex-col items-start md:flex md:self-center md:items-end">
                <ActionLink
                  href={`${import.meta.env.BASE_URL}login/`}
                  variant="secondary"
                  className="border-rose-600 bg-rose-600 text-white hover:border-rose-500 hover:bg-rose-500 [html[data-theme='dark']_&]:border-rose-500 [html[data-theme='dark']_&]:bg-rose-500 [html[data-theme='dark']_&]:text-white [html[data-theme='dark']_&]:hover:border-rose-400 [html[data-theme='dark']_&]:hover:bg-rose-400"
                  onClick={() => trackEvent('click_navigate', { url: 'login/', from: 'today_suggestions' })}
                >
                  Connect My Pokedex
                </ActionLink>
              </div>
            </div>
          </section>

          <section className="mb-2.5 w-full max-w-[600px] rounded-xl border border-[var(--border)] bg-[var(--code-bg)] p-3 text-left">
            <div className="flex flex-col items-center gap-3 text-center">
              <div>
                <p className="m-0 text-sm font-semibold text-[var(--text-h)]">Answer Visibility</p>
                <p className="m-0 text-xs text-[var(--text)]">Choose whether answers stay hidden until you reveal them.</p>
              </div>
              <div className="grid grid-cols-[170px_auto] items-center justify-center gap-3">
                <div className="text-left">
                  <p className="m-0 text-sm font-medium text-[var(--text-h)]">Avoid spoilers</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={spoilerModeEnabled}
                  onClick={() => {
                    void toggleSpoilerMode();
                  }}
                  disabled={isSavingSpoilerPreference}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors ${
                    spoilerModeEnabled ? 'border-emerald-500 bg-emerald-500' : 'border-[var(--border)] bg-slate-300'
                  } ${isSavingSpoilerPreference ? 'opacity-70' : ''}`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-[var(--bg)] shadow transition-transform ${
                      spoilerModeEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      <div className="relative">
        <Grid
          cells={grid.cells}
          rowConstraints={grid.rowConstraints}
          colConstraints={grid.colConstraints}
          possiblePokemon={possiblePokemon}
          fallbackOwnedCells={fallbackOwnedCells}
          ownedPokemonKeyIds={caughtSet}
          shinyPokemonKeyIds={new Set(remoteUserDex?.shinyPokemonKeyIds ?? [])}
          suggestedPokemonKeys={suggestedPokemonKeys}
          swapOptionCounts={swapOptionCounts}
          totalSwapOptionCounts={totalSwapOptionCounts}
          selectedCell={grid.selectedCell}
          editable={false}
          showSuggestedMeta
          showOwnedState={showMissingOnly}
          highlightSwapCount={showMissingOnly}
          singularHintCountLabel={showMissingOnly ? 'new entry' : 'valid answer'}
          pluralHintCountLabel={showMissingOnly ? 'new entries' : 'valid answers'}
          spoilerModeEnabled={spoilerModeEnabled}
          revealStates={revealStates}
          onCellClick={handleCellClick}
          onSwapClick={handleCellClick}
          onAdvanceReveal={advanceReveal}
          onConstraintChange={() => {}}
        />
        {canShowSuggestionsPanel ? (
          <button
            type="button"
            aria-label="Close suggestions"
            className="fixed inset-0 z-20 cursor-default border-0 bg-black/10 p-0 backdrop-blur-[2px]"
            onClick={() => {
              setGrid((prev) => ({ ...prev, selectedCell: null }));
              setSelectedCellAnchorElement(null);
            }}
          />
        ) : null}
        <SuggestionsPanel
          key={grid.selectedCell ? `${grid.selectedCell[0]}-${grid.selectedCell[1]}-${selectedCellDisplayPokemon ? 'pokemon' : 'open'}-${selectedCellHasPlacedPokemon ? 'placed' : 'fallback'}` : 'closed'}
          selectedCell={canShowSuggestionsPanel ? grid.selectedCell : null}
          possiblePokemon={selectedCellPossible}
          currentPokemon={selectedCellDisplayPokemon}
          rowConstraint={grid.selectedCell ? grid.rowConstraints[grid.selectedCell[0]] : null}
          colConstraint={grid.selectedCell ? grid.colConstraints[grid.selectedCell[1]] : null}
          ownedPokemonKeyIds={caughtSet}
          shinyPokemonKeyIds={new Set(remoteUserDex?.shinyPokemonKeyIds ?? [])}
          showOwnershipState={showMissingOnly}
          anchorElement={selectedCellAnchorElement}
          onClose={() => {
            setGrid((prev) => ({ ...prev, selectedCell: null }));
            setSelectedCellAnchorElement(null);
          }}
          onSelect={handlePokemonSelect}
          onMarkOwned={isLoggedIn && remoteUserDex ? markSelectedPokemonOwned : undefined}
          onMarkShiny={isLoggedIn && remoteUserDex ? markSelectedPokemonShiny : undefined}
        />
      </div>
      <div className="mt-2 mb-4 flex flex-wrap justify-center gap-2.5">
        <ActionButton onClick={clearCells} variant="destructiveGhost" disabled={!hasGridData}>
          Clear selected Pokemon
        </ActionButton>
        <ActionLink
          href={`${import.meta.env.BASE_URL}custom/`}
          variant="secondary"
          onClick={() => trackEvent('click_navigate', { url: 'custom/', from: 'today_suggestions' })}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Try another board
        </ActionLink>
      </div>

      { isLoggedIn ? (<section className="mt-4 w-full max-w-[760px]" aria-labelledby="today-board-faq-heading">
        <h2 id="today-board-faq-heading" className="mb-2 text-lg font-semibold tracking-tight text-[var(--text-h)]">
          Why these picks?
        </h2>
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)]">
          {TODAY_BOARD_RECOMMENDATION_FAQ.map((item, index) => (
            <details
              key={item.question}
              className={index === 0 ? 'group' : 'group border-t border-[var(--border)]'}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold text-[var(--text-h)] transition-colors hover:bg-[var(--accent-bg)] [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <svg
                  className="h-4 w-4 shrink-0 text-[var(--text)] transition-transform duration-200 group-open:rotate-180"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <div className="px-4 pb-4 text-sm leading-6 text-[var(--text)]">
                <p className="m-0 opacity-90">{item.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </section>): null}

      <TodayBoardSuggestions
        textualSuggestions={textualSuggestions}
        spoilerModeEnabled={spoilerModeEnabled}
        revealStates={revealStates}
        onAdvanceReveal={advanceReveal}
      />
    </div>
  );
}
