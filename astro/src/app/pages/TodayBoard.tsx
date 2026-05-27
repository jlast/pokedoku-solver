import { useEffect, useMemo, useState } from 'react';
import type { Pokemon } from '@pokedoku-helper/shared-types';
import { trackEvent } from '../../../../lib/browser/analytics';
import { matchesConstraint, type Constraint } from '../../../../lib/shared/filters';
import { getRemoteSettings, getRemoteUserDex, patchRemoteSettings, patchRemoteUserDex, type UserDexPayload } from '@pokedoku-helper/user-api-client';
import { Grid } from '../components/Grid';
import { InfoBox } from '../components/InfoBox';
import { SuggestionsPanel } from '../components/SuggestionsPanel';
import { TodayBoardSuggestions } from '../components/TodayBoardSuggestions';
import { ActionButton, ActionLink } from '../components/shared/ActionButton';
import { getSessionUserProfile, getValidSessionIdToken } from '../../lib/cognitoAuth';
import { getPokemonKeyId } from '../lib/pokemonGrid';
import { buildFallbackOwnedCells, buildSuggestedCells, buildTextualSuggestionEntries } from '../lib/todayBoard';

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

function getApiBaseUrl(): string | null {
  const baseUrl = import.meta.env.PUBLIC_USER_DEX_API_BASE_URL;
  if (!baseUrl || typeof baseUrl !== 'string') return null;
  return baseUrl;
}

function createEmptyCells(size: number): (Pokemon | null)[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null));
}

function createEmptyKeyGrid(size: number): (string | null)[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null));
}

export function TodayBoard({ puzzle }: { puzzle: TodayPuzzle }) {
  const isLoggedIn = typeof window !== 'undefined' && Boolean(getSessionUserProfile());
  const gridSize = puzzle.rowConstraints.length;
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [grid, setGrid] = useState<GridState>(() => ({
    cells: createEmptyCells(gridSize),
    rowConstraints: [...puzzle.rowConstraints],
    colConstraints: [...puzzle.colConstraints],
    selectedCell: null,
  }));
  const [suggestedPokemonKeys, setSuggestedPokemonKeys] = useState<(string | null)[][]>(() => createEmptyKeyGrid(gridSize));
  const [showMissingOnly, setShowMissingOnly] = useState<boolean>(() => isLoggedIn);
  const [isSavingFilterPreference, setIsSavingFilterPreference] = useState(false);
  const [isMarkingCompleted, setIsMarkingCompleted] = useState(false);
  const [caughtSet, setCaughtSet] = useState<Set<number>>(new Set<number>());
  const [remoteUserDex, setRemoteUserDex] = useState<UserDexPayload | null>(null);
  const [selectedCellAnchorElement, setSelectedCellAnchorElement] = useState<HTMLDivElement | null>(null);

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
        const [userDex, settings] = await Promise.all([
          getRemoteUserDex({ token, apiBaseUrl }),
          getRemoteSettings({ token, apiBaseUrl }),
        ]);
        if (isCancelled) return;

        if (userDex) {
          setCaughtSet(new Set(userDex.caughtPokemonKeyIds));
          setRemoteUserDex(userDex);
        }
        if (settings) {
          setShowMissingOnly(settings.myPokedexFilter);
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

  useEffect(() => {
    if (pokemonPool.length === 0) return;

    const { cells, suggestedKeys } = buildSuggestedCells(pokemonPool, puzzle.rowConstraints, puzzle.colConstraints);
    const timer = window.setTimeout(() => {
      setSuggestedPokemonKeys(suggestedKeys);
      setGrid((prev) => ({ ...prev, cells }));
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [pokemonPool, puzzle.colConstraints, puzzle.rowConstraints]);

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
    if (!isLoggedIn || !showMissingOnly || caughtSet.size === 0) return createEmptyCells(gridSize);

    return buildFallbackOwnedCells({
      pokemon,
      gridCells: grid.cells,
      rowConstraints: grid.rowConstraints,
      colConstraints: grid.colConstraints,
      possiblePokemon,
      caughtSet,
      shinyPokemonKeyIds: new Set(remoteUserDex?.shinyPokemonKeyIds ?? []),
    });
  }, [caughtSet, grid.cells, grid.colConstraints, grid.rowConstraints, gridSize, isLoggedIn, pokemon, possiblePokemon, remoteUserDex, showMissingOnly]);

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

  function handleCellClick(row: number, col: number, anchorElement?: HTMLDivElement | null) {
    setGrid((prev) => {
      const isSameCell = prev.selectedCell?.[0] === row && prev.selectedCell?.[1] === col;
      setSelectedCellAnchorElement(isSameCell ? null : (anchorElement ?? null));
      return { ...prev, selectedCell: isSameCell ? null : [row, col] };
    });
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
      cells: createEmptyCells(gridSize),
      selectedCell: null,
    }));
  }

  async function markAllAsCompleted() {
    if (isMarkingCompleted) return;

    const completedIds = grid.cells
      .flat()
      .filter((cell): cell is Pokemon => Boolean(cell))
      .map((cell) => getPokemonKeyId(cell));

    if (completedIds.length === 0 || !remoteUserDex) return;

    setIsMarkingCompleted(true);
    try {
      const token = await getValidSessionIdToken();
      const apiBaseUrl = getApiBaseUrl();
      if (!token || !apiBaseUrl) return;

      const mergedSet = new Set(caughtSet);
      for (const id of completedIds) mergedSet.add(id);

      const nextPayload: UserDexPayload = {
        caughtPokemonKeyIds: Array.from(mergedSet).sort((a, b) => a - b),
        shinyPokemonKeyIds: remoteUserDex.shinyPokemonKeyIds,
        unlockedPrestigeLevelIndex: remoteUserDex.unlockedPrestigeLevelIndex,
      };

      const updated = await patchRemoteUserDex({
        token,
        apiBaseUrl,
        payload: nextPayload,
      });
      if (!updated) return;

      setCaughtSet(mergedSet);
      setRemoteUserDex(nextPayload);
      trackEvent('click_mark_all_completed', { count: completedIds.length.toString() });
    } finally {
      setIsMarkingCompleted(false);
    }
  }

  const hasGridData = grid.cells.some((row) => row.some((cell) => cell !== null));

  async function toggleMyPokedexFilter() {
    const nextValue = !showMissingOnly;
    setShowMissingOnly(nextValue);

    const token = await getValidSessionIdToken();
    const apiBaseUrl = getApiBaseUrl();
    if (!token || !apiBaseUrl) return;

    setIsSavingFilterPreference(true);
    const updated = await patchRemoteSettings({
      token,
      apiBaseUrl,
      patch: { myPokedexFilter: nextValue },
    });
    setIsSavingFilterPreference(false);

    if (!updated) {
      setShowMissingOnly(!nextValue);
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

  const textualSuggestions = useMemo(() => {
    return buildTextualSuggestionEntries({
      gridCells: grid.cells,
      rowConstraints: grid.rowConstraints,
      colConstraints: grid.colConstraints,
      fallbackOwnedCells,
    });
  }, [fallbackOwnedCells, grid.cells, grid.colConstraints, grid.rowConstraints]);

  if (loading) {
    return <div className="min-h-screen p-5 text-center"><p>Loading Pokemon data...</p></div>;
  }

  return (
    <div className="flex flex-col items-center">
      {isLoggedIn ? (
        <section className="mb-3 w-full max-w-[700px] rounded-xl border border-[var(--border)] bg-[var(--code-bg)] p-3 text-left">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="m-0 text-sm font-semibold text-[var(--text-h)]">My Pokedex filter</p>
              <p className="m-0 text-xs text-[var(--text)]">Show only entries you still need</p>
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
          {showMissingOnly ? (
            <div className="mt-2">
              <ActionButton
                onClick={markAllAsCompleted}
                variant="success"
                disabled={!hasGridData || !remoteUserDex || isMarkingCompleted}
              >
                {isMarkingCompleted ? (
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
                    Mark all as completed in My Pokedex
                  </>
                )}
              </ActionButton>
            </div>
          ) : null}
        </section>
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
          suggestedPokemonKeys={suggestedPokemonKeys}
          swapOptionCounts={swapOptionCounts}
          selectedCell={grid.selectedCell}
          editable={false}
          showSuggestedMeta
          onCellClick={handleCellClick}
          onSwapClick={handleCellClick}
          onConstraintChange={() => {}}
        />
        {grid.selectedCell ? (
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
          selectedCell={grid.selectedCell}
          possiblePokemon={selectedCellPossible}
          currentPokemon={selectedCellDisplayPokemon}
          ownedPokemonKeyIds={caughtSet}
          shinyPokemonKeyIds={new Set(remoteUserDex?.shinyPokemonKeyIds ?? [])}
          anchorElement={selectedCellAnchorElement}
          onClose={() => {
            setGrid((prev) => ({ ...prev, selectedCell: null }));
            setSelectedCellAnchorElement(null);
          }}
          onSelect={handlePokemonSelect}
        />
      </div>
      <InfoBox>These are strategic Pokedoku answers that prioritize harder-to-place Pokemon for Pokedex completion. Tap a square for all options.</InfoBox>

      <div className="mt-2 flex flex-wrap justify-center gap-2.5">
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

      <TodayBoardSuggestions textualSuggestions={textualSuggestions} />
    </div>
  );
}
