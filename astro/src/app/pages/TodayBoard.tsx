import { useEffect, useMemo, useState } from 'react';
import type { Pokemon } from '@pokedoku-helper/shared-types';
import { getRemoteUserPuzzle, putRemoteUserPuzzle, type UserDexPayload, type UserPuzzleAnswerPayload } from '@pokedoku-helper/user-api-client';
import { trackEvent } from '../../../../lib/browser/analytics';
import { matchesConstraint, type Constraint } from '../../../../lib/shared/filters';
import { getPuzzleArchiveSlug } from '../../lib/puzzleArchive';
import { Grid } from '../components/Grid';
import { SuggestionsPanel } from '../components/SuggestionsPanel';
import { TodayBoardSuggestions } from '../components/TodayBoardSuggestions';
import { PokedexFilterPanel } from '../components/PokedexFilterPanel';
import { PokedexPromoCard } from '../components/PokedexPromoCard';
import { ActionButton } from '../components/shared/ActionButton';
import { ActionLink } from '../components/shared/ActionLink';
import { getSessionUserProfile, getValidSessionIdToken } from '../../lib/cognitoAuth';
import {
  getApiBaseUrl,
  loadPokedexSettingsState,
  saveCaughtPokemonPayload,
  saveCollapsePokedexAnswerFiltersPreference,
  saveMyPokedexFilterPreference,
  saveSpoilerModePreference,
} from '../lib/pokedexSettings';
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

function createEmptySavedAnswerGrid(size: number): (number | null)[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null));
}

function toSavedAnswers(savedAnswerKeyIds: (number | null)[][]): UserPuzzleAnswerPayload[] {
  return savedAnswerKeyIds.flatMap((row, rowIndex) =>
    row.flatMap((pokemonKeyId, colIndex) => (
      pokemonKeyId ? [{ row: rowIndex, col: colIndex, pokemonKeyId }] : []
    )),
  );
}

function countSavedAnswers(savedAnswerKeyIds: (number | null)[][]): number {
  return savedAnswerKeyIds.reduce((total, row) => total + row.filter((entry) => entry !== null).length, 0);
}

function overlaySavedAnswers(cells: (Pokemon | null)[][], savedAnswerKeyIds: (number | null)[][], pokemon: Pokemon[]): (Pokemon | null)[][] {
  const pokemonByKeyId = new Map(pokemon.map((entry) => [getPokemonKeyId(entry), entry]));

  return cells.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      const pokemonKeyId = savedAnswerKeyIds[rowIndex]?.[colIndex] ?? null;
      return pokemonKeyId ? pokemonByKeyId.get(pokemonKeyId) ?? cell : cell;
    }),
  );
}

function getSavedAnswerKeyIdsFromCells(cells: (Pokemon | null)[][]): (number | null)[][] {
  return cells.map((row) => row.map((cell) => (cell ? getPokemonKeyId(cell) : null)));
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

export function TodayBoard({ puzzle, showRecommendations = true }: { puzzle: TodayPuzzle; showRecommendations?: boolean }) {
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
  const [isFilterPanelCollapsed, setIsFilterPanelCollapsed] = useState(false);
  const [isSavingFilterPanelCollapsedPreference, setIsSavingFilterPanelCollapsedPreference] = useState(false);
  const [selectedCellAnchorElement, setSelectedCellAnchorElement] = useState<HTMLDivElement | null>(null);
  const [spoilerModeEnabled, setSpoilerModeEnabled] = useState(false);
  const [revealStates, setRevealStates] = useState<Record<string, RevealState>>(() => createInitialRevealStates(gridSize));
  const [savedAnswerKeyIds, setSavedAnswerKeyIds] = useState<(number | null)[][]>(() => createEmptySavedAnswerGrid(gridSize));
  const [savedPuzzleCompletedAt, setSavedPuzzleCompletedAt] = useState<string | null>(null);
  const [puzzleSaveStatus, setPuzzleSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [hasClearedCells, setHasClearedCells] = useState(false);
  const puzzleKey = getPuzzleArchiveSlug(puzzle);

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
        const [pokedexSettingsResult, savedPuzzleResult] = await Promise.allSettled([
          loadPokedexSettingsState(token, apiBaseUrl),
          getRemoteUserPuzzle({ token, apiBaseUrl, puzzleKey }),
        ]);
        if (isCancelled) return;

        if (pokedexSettingsResult.status === 'fulfilled') {
          const { userDex, myPokedexFilter, spoilerModeEnabled, collapsePokedexAnswerFilters } = pokedexSettingsResult.value;
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
          if (collapsePokedexAnswerFilters !== null) {
            setIsFilterPanelCollapsed(collapsePokedexAnswerFilters);
          }
        }

        const savedPuzzle = savedPuzzleResult.status === 'fulfilled' ? savedPuzzleResult.value : null;
        if (savedPuzzle) {
          const nextSavedAnswerKeyIds = createEmptySavedAnswerGrid(gridSize);
          for (const answer of savedPuzzle.answers) {
            if (answer.row < gridSize && answer.col < gridSize) {
              nextSavedAnswerKeyIds[answer.row][answer.col] = answer.pokemonKeyId;
            }
          }
          setSavedAnswerKeyIds(nextSavedAnswerKeyIds);
          setSavedPuzzleCompletedAt(savedPuzzle.completedAt);
          setPuzzleSaveStatus('saved');
        }
      } catch {}
    })();

    return () => {
      isCancelled = true;
    };
  }, [gridSize, isLoggedIn, puzzleKey]);

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
    if (pokemon.length === 0) return;

    const { cells, suggestedKeys } = pokemonPool.length > 0
      ? buildSuggestedCells(
        pokemonPool,
        puzzle.rowConstraints,
        puzzle.colConstraints,
        personalizedRemainingGroupScoreByKeyId,
      )
      : { cells: createEmptyPokemonGrid(gridSize), suggestedKeys: createEmptyKeyGrid(gridSize) };
    const baseCells = hasClearedCells ? createEmptyPokemonGrid(gridSize) : cells;
    const displayCells = overlaySavedAnswers(baseCells, savedAnswerKeyIds, pokemon);
    const timer = window.setTimeout(() => {
      setSuggestedPokemonKeys(suggestedKeys);
      setGrid((prev) => ({ ...prev, cells: displayCells }));
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [gridSize, hasClearedCells, personalizedRemainingGroupScoreByKeyId, pokemon, pokemonPool, puzzle.colConstraints, puzzle.rowConstraints, savedAnswerKeyIds]);

  async function savePuzzleAnswers(nextSavedAnswerKeyIds: (number | null)[][]) {
    if (!isLoggedIn) return;

    const token = await getValidSessionIdToken();
    const apiBaseUrl = getApiBaseUrl();
    if (!token || !apiBaseUrl) return;

    const answers = toSavedAnswers(nextSavedAnswerKeyIds);
    const completedAt = savedPuzzleCompletedAt ?? (countSavedAnswers(nextSavedAnswerKeyIds) === gridSize * gridSize ? new Date().toISOString() : null);
    setPuzzleSaveStatus('saving');

    const savedPuzzle = await putRemoteUserPuzzle({
      token,
      apiBaseUrl,
      puzzleKey,
      payload: {
        answers,
        completedAt,
      },
    });

    if (!savedPuzzle) {
      setPuzzleSaveStatus('error');
      return;
    }

    setSavedPuzzleCompletedAt(savedPuzzle.completedAt);
    setPuzzleSaveStatus('saved');
  }

  function saveCurrentGridPuzzleAnswers(cells: (Pokemon | null)[][]) {
    const nextSavedAnswerKeyIds = getSavedAnswerKeyIdsFromCells(cells);
    setSavedAnswerKeyIds(nextSavedAnswerKeyIds);
    void savePuzzleAnswers(nextSavedAnswerKeyIds);
  }

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
    const pokemonKeyId = getPokemonKeyId(selectedPokemon);
    const nextSavedAnswerKeyIds = savedAnswerKeyIds.map((currentRow, currentRowIndex) =>
      currentRowIndex === row
        ? currentRow.map((currentValue, currentColIndex) => (currentColIndex === col ? pokemonKeyId : currentValue))
        : currentRow,
    );
    setSavedAnswerKeyIds(nextSavedAnswerKeyIds);
    setGrid((prev) => ({
      ...prev,
      cells: prev.cells.map((currentRow, currentRowIndex) =>
        currentRowIndex === row
          ? currentRow.map((cellValue, currentColIndex) => (currentColIndex === col ? selectedPokemon : cellValue))
          : currentRow,
      ),
      selectedCell: null,
    }));
    void savePuzzleAnswers(nextSavedAnswerKeyIds);
  }

  function clearCells() {
    trackEvent('bulk_action', {
      page_name: 'today',
      location: 'grid',
      target: 'clear_all',
    });
    setGrid((prev) => ({
      ...prev,
      cells: createEmptyPokemonGrid(gridSize),
      selectedCell: null,
    }));
    const nextSavedAnswerKeyIds = createEmptySavedAnswerGrid(gridSize);
    setSavedAnswerKeyIds(nextSavedAnswerKeyIds);
    setHasClearedCells(true);
    void savePuzzleAnswers(nextSavedAnswerKeyIds);
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

      const didSave = await saveCaughtPokemonPayload(token, apiBaseUrl, nextPayload);
      if (!didSave) return;

      setCaughtSet(mergedSet);
      setRemoteUserDex(nextPayload);
      saveCurrentGridPuzzleAnswers(grid.cells);
      setUndoMarkOwnedState({
        previousUserDex: remoteUserDex,
        addedCount: ownedIds.filter((id) => !caughtSet.has(id)).length,
      });
      trackEvent('bulk_action', {
        page_name: 'today',
        location: 'suggestions',
        target: 'mark_all_completed',
        count: ownedIds.length,
      });
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

      const didSave = await saveCaughtPokemonPayload(token, apiBaseUrl, undoMarkOwnedState.previousUserDex);
      if (!didSave) return;

      const restoredCount = undoMarkOwnedState.addedCount;
      setCaughtSet(new Set(undoMarkOwnedState.previousUserDex.caughtPokemonKeyIds));
      setRemoteUserDex(undoMarkOwnedState.previousUserDex);
      setUndoMarkOwnedState(null);
      trackEvent('dex_state_update', {
        page_name: 'today',
        location: 'suggestions',
        target: 'selection',
        value: 'undo',
        count: restoredCount,
      });
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

    const didSave = await saveCaughtPokemonPayload(token, apiBaseUrl, nextPayload);
    if (!didSave) {
      setCaughtSet(new Set(remoteUserDex.caughtPokemonKeyIds));
      setRemoteUserDex(remoteUserDex);
      return;
    }

    trackEvent('dex_state_update', {
      page_name: 'today',
      location: 'suggestions',
      target: 'pokemon',
      value: pokemon.name,
      pokemon_key_id: pokemonKeyId,
      caught: nextCaughtSet.has(pokemonKeyId),
      shiny: nextShinySet.has(pokemonKeyId),
    });

    if (grid.selectedCell) {
      const [row, col] = grid.selectedCell;
      const nextSavedAnswerKeyIds = savedAnswerKeyIds.map((currentRow, currentRowIndex) =>
        currentRowIndex === row
          ? currentRow.map((currentValue, currentColIndex) => (currentColIndex === col ? pokemonKeyId : currentValue))
          : currentRow,
      );
      setSavedAnswerKeyIds(nextSavedAnswerKeyIds);
      void savePuzzleAnswers(nextSavedAnswerKeyIds);
    }
  }

  async function markSelectedPokemonOwned(pokemon: Pokemon) {
    await saveSelectedPokemonDexState(pokemon, { owned: !caughtSet.has(getPokemonKeyId(pokemon)) });
  }

  async function markSelectedPokemonShiny(pokemon: Pokemon) {
    await saveSelectedPokemonDexState(pokemon, { shiny: true });
  }

  function redirectToLogin() {
    trackEvent('ui_click', {
      page_name: 'today',
      location: 'suggestions',
      source: 'button',
      target: 'navigate',
      value: 'login/',
    });
    window.location.assign(`${import.meta.env.BASE_URL}login/`);
  }

  const hasGridData = grid.cells.some((row) => row.some((cell) => cell !== null));

  async function toggleMyPokedexFilter() {
    const nextValue = !showMissingOnly;
    setShowMissingOnly(nextValue);

    const token = await getValidSessionIdToken();
    const apiBaseUrl = getApiBaseUrl();
    if (!token || !apiBaseUrl) return;

    setIsSavingFilterPreference(true);
    const didSave = await saveMyPokedexFilterPreference(token, apiBaseUrl, nextValue);
    setIsSavingFilterPreference(false);

    if (!didSave) {
      setShowMissingOnly(!nextValue);
    }
  }

  async function toggleSpoilerMode() {
    const nextValue = !spoilerModeEnabled;
    setSpoilerModeEnabled(nextValue);
    trackEvent('toggle_setting', {
      page_name: 'today',
      location: 'suggestions',
      target: 'spoiler_mode',
      enabled: nextValue,
    });

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

  async function toggleFilterPanelCollapsed() {
    const nextValue = !isFilterPanelCollapsed;
    setIsFilterPanelCollapsed(nextValue);

    const token = await getValidSessionIdToken();
    const apiBaseUrl = getApiBaseUrl();
    if (!token || !apiBaseUrl) return;

    setIsSavingFilterPanelCollapsedPreference(true);
    try {
      const didSave = await saveCollapsePokedexAnswerFiltersPreference(token, apiBaseUrl, nextValue);
      if (!didSave) {
        setIsFilterPanelCollapsed(!nextValue);
      }
    } finally {
      setIsSavingFilterPanelCollapsedPreference(false);
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

  const hasSavedAnswers = countSavedAnswers(savedAnswerKeyIds) > 0;

  if (loading) {
    return <div className="min-h-screen p-5 text-center"><p>Loading Pokemon data...</p></div>;
  }

  return (
      <div className="flex flex-col items-center">
       {isLoggedIn ? (
         <PokedexFilterPanel
           showMissingOnly={showMissingOnly}
           onToggleMyPokedexFilter={() => {
             void toggleMyPokedexFilter();
           }}
           isSavingFilterPreference={isSavingFilterPreference}
           showSpoilerToggle
           spoilerModeEnabled={spoilerModeEnabled}
           onToggleSpoilerMode={() => {
             void toggleSpoilerMode();
           }}
           isSavingSpoilerPreference={isSavingSpoilerPreference}
           showSaveActions
           onMarkOwned={markOwned}
           onUndoMarkOwned={() => {
             void undoMarkOwned();
           }}
           disableMarkOwned={!hasGridData || !remoteUserDex || isMarkingOwned || isUndoingMarkOwned}
           disableUndoMarkOwned={!undoMarkOwnedState || isUndoingMarkOwned || isMarkingOwned}
            isMarkingOwned={isMarkingOwned}
            isUndoingMarkOwned={isUndoingMarkOwned}
            isCollapsed={isFilterPanelCollapsed}
            onToggleCollapsed={() => {
              void toggleFilterPanelCollapsed();
            }}
           isSavingCollapsedPreference={isSavingFilterPanelCollapsedPreference}
          />
        ) : (
         <>
           <PokedexPromoCard trackingFrom="today_suggestions" />

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

      {isLoggedIn && (hasSavedAnswers || puzzleSaveStatus !== 'idle') ? (
        <p className={`mb-2 mt-0 text-xs ${puzzleSaveStatus === 'error' ? 'text-red-600 [html[data-theme=\'dark\']_&]:text-red-300' : 'text-[var(--text)]'}`}>
          {puzzleSaveStatus === 'saving' ? 'Saving puzzle picks...' : null}
          {puzzleSaveStatus === 'saved' ? `Puzzle picks saved${savedPuzzleCompletedAt ? ' and completion recorded' : ''}.` : null}
          {puzzleSaveStatus === 'error' ? 'Could not save puzzle picks. Your board still works locally.' : null}
        </p>
      ) : null}

      <div className="relative">
        <Grid
          cells={grid.cells}
          rowConstraints={grid.rowConstraints}
          colConstraints={grid.colConstraints}
          possiblePokemon={possiblePokemon}
          fallbackOwnedCells={fallbackOwnedCells}
          ownedPokemonKeyIds={caughtSet}
          shinyPokemonKeyIds={new Set(remoteUserDex?.shinyPokemonKeyIds ?? [])}
          lockedAnswerKeyIds={savedAnswerKeyIds}
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
          onMarkOwned={isLoggedIn && remoteUserDex ? markSelectedPokemonOwned : redirectToLogin}
          onMarkShiny={isLoggedIn && remoteUserDex ? markSelectedPokemonShiny : redirectToLogin}
        />
      </div>
      <div className="mt-2 mb-4 flex flex-wrap justify-center gap-2.5">
        <ActionButton onClick={clearCells} variant="destructiveGhost" disabled={!hasGridData}>
          Clear selected Pokemon
        </ActionButton>
        <ActionLink
          href={`${import.meta.env.BASE_URL}custom/`}
          variant="secondary"
          onClick={() =>
            trackEvent('ui_click', {
              page_name: 'today',
              location: 'suggestions',
              source: 'link',
              target: 'navigate',
              value: 'custom/',
            })
          }
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

      {showRecommendations ? (
        <TodayBoardSuggestions
          textualSuggestions={textualSuggestions}
          spoilerModeEnabled={spoilerModeEnabled}
          revealStates={revealStates}
          onAdvanceReveal={advanceReveal}
        />
      ) : null}
    </div>
  );
}
