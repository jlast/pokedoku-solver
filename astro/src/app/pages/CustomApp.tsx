import { useState, useMemo, useEffect } from "react";
import type { Pokemon } from "@pokedoku-helper/shared-types";
import type { UserDexPayload } from "@pokedoku-helper/user-api-client";
import { GRID_SIZE } from "../../../../lib/shared/constants";
import { matchesConstraint, findConstraintOption, type Constraint } from "../../../../lib/shared/filters";
import { trackEvent } from "../../../../lib/browser/analytics";
import { Grid } from "../components/Grid";
import { Header } from "../components/Header";
import { SuggestionsPanel } from "../components/SuggestionsPanel";
import { Footer } from "../components/Footer";
import { InfoBox } from "../components/InfoBox";
import { PokedexFilterPanel } from "../components/PokedexFilterPanel";
import { PokedexPromoCard } from "../components/PokedexPromoCard";
import { ContentSection } from "../components/shared/ContentSection";
import { ActionButton } from "../components/shared/ActionButton";
import { getSessionUserProfile, getValidSessionIdToken } from "../../lib/cognitoAuth";
import {
  getApiBaseUrl,
  loadPokedexSettingsState,
  saveCaughtPokemonPayload,
  saveCollapsePokedexAnswerFiltersPreference,
  saveMyPokedexFilterPreference,
} from "../lib/pokedexSettings";
import {
  buildFallbackOwnedCells,
  buildPersonalizedRemainingGroupScoreMap,
  buildSuggestedCells,
  createEmptyKeyGrid,
  createEmptyPokemonGrid,
} from "../lib/todayBoard";
import { getPokemonKeyId } from "../lib/pokemonGrid";

function parseConstraintFromParam(value: string): Constraint | null {
  const result = findConstraintOption(value);
  if (!result) return null;
  return { category: result.category, value: result.value };
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

function createEmptyGridState(): GridState {
  return {
    cells: Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill(null)),
    rowConstraints: Array(GRID_SIZE).fill(null),
    colConstraints: Array(GRID_SIZE).fill(null),
    selectedCell: null,
  };
}

function createInitialGridState(): GridState {
  if (typeof window === "undefined") {
    return createEmptyGridState();
  }

  const params = new URLSearchParams(window.location.search);
  const parseConstraints = (key: string): (Constraint | null)[] => {
    const values = params.get(key)?.split(",").slice(0, GRID_SIZE) || [];
    return values.map((val) => parseConstraintFromParam(val));
  };

  const rowConstraints = parseConstraints("rows");
  const colConstraints = parseConstraints("cols");
  while (rowConstraints.length < GRID_SIZE) rowConstraints.push(null);
  while (colConstraints.length < GRID_SIZE) colConstraints.push(null);

  return {
    cells: Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill(null)),
    rowConstraints,
    colConstraints,
    selectedCell: null,
  };
}

function App() {
  const isLoggedIn = typeof window !== "undefined" && Boolean(getSessionUserProfile());
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [grid, setGrid] = useState<GridState>(createInitialGridState);
  const [selectedCellAnchorElement, setSelectedCellAnchorElement] = useState<HTMLDivElement | null>(null);
  const [showMissingOnly, setShowMissingOnly] = useState<boolean>(() => isLoggedIn);
  const [isSavingFilterPreference, setIsSavingFilterPreference] = useState(false);
  const [isMarkingOwned, setIsMarkingOwned] = useState(false);
  const [isUndoingMarkOwned, setIsUndoingMarkOwned] = useState(false);
  const [caughtSet, setCaughtSet] = useState<Set<number>>(new Set<number>());
  const [remoteUserDex, setRemoteUserDex] = useState<UserDexPayload | null>(null);
  const [undoMarkOwnedState, setUndoMarkOwnedState] = useState<UndoMarkOwnedState | null>(null);
  const [suggestedPokemonKeys, setSuggestedPokemonKeys] = useState<(string | null)[][]>(() => createEmptyKeyGrid(GRID_SIZE));
  const [isFilterPanelCollapsed, setIsFilterPanelCollapsed] = useState(false);
  const [isSavingFilterPanelCollapsedPreference, setIsSavingFilterPanelCollapsedPreference] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/pokemon.json?t=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => {
        setPokemon(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load Pokemon:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    let isCancelled = false;
    void (async () => {
      const token = await getValidSessionIdToken();
      const apiBaseUrl = getApiBaseUrl();
      if (!token || !apiBaseUrl) return;

      try {
        const { userDex, myPokedexFilter, collapsePokedexAnswerFilters } = await loadPokedexSettingsState(token, apiBaseUrl);
        if (isCancelled) return;

        if (userDex) {
          setCaughtSet(new Set(userDex.caughtPokemonKeyIds));
          setRemoteUserDex(userDex);
          setUndoMarkOwnedState(null);
        }
        if (myPokedexFilter !== null) {
          setShowMissingOnly(myPokedexFilter);
        }
        if (collapsePokedexAnswerFilters !== null) {
          setIsFilterPanelCollapsed(collapsePokedexAnswerFilters);
        }
      } catch {}
    })();

    return () => {
      isCancelled = true;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const toQueryString = (constraints: (Constraint | null)[]): string =>
      constraints
        .map((c) => (c ? `${c.category}:${c.value}` : ""))
        .filter(Boolean)
        .join(",");
    const rowsStr = toQueryString(grid.rowConstraints);
    const colsStr = toQueryString(grid.colConstraints);
    if (rowsStr) params.set("rows", rowsStr);
    else params.delete("rows");
    if (colsStr) params.set("cols", colsStr);
    else params.delete("cols");
    const newUrl = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
    window.history.replaceState({}, "", newUrl);
  }, [grid.rowConstraints, grid.colConstraints]);

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
    const { cells, suggestedKeys } = buildSuggestedCells(
      pokemonPool,
      grid.rowConstraints,
      grid.colConstraints,
      personalizedRemainingGroupScoreByKeyId,
    );

    const timer = window.setTimeout(() => {
      setSuggestedPokemonKeys(suggestedKeys);
      setGrid((prev) => ({ ...prev, cells }));
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [grid.colConstraints, grid.rowConstraints, personalizedRemainingGroupScoreByKeyId, pokemonPool]);

  const possiblePokemon = useMemo(() => {
    const result: Pokemon[][][] = Array(GRID_SIZE)
      .fill(null)
      .map(() =>
        Array(GRID_SIZE)
          .fill(null)
          .map(() => [] as Pokemon[]),
      );

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (grid.cells[row][col] !== null) {
          result[row][col] = [grid.cells[row][col]!];
          continue;
        }

        const usedInRow = new Set(
          grid.cells[row].filter(Boolean).map((p) => p!.id),
        );
        const usedInCol = new Set(
          grid.cells
            .map((r) => r[col])
            .filter(Boolean)
            .map((p) => p!.id),
        );
        const rowConstraint = grid.rowConstraints[row];
        const colConstraint = grid.colConstraints[col];

        const candidates = pokemonPool.filter((p) => {
          if (usedInRow.has(p.id) || usedInCol.has(p.id)) return false;
          if (!matchesConstraint(p, rowConstraint)) return false;
          if (!matchesConstraint(p, colConstraint)) return false;
          return true;
        });

        result[row][col] = candidates;
      }
    }

    return result;
  }, [grid, pokemonPool]);

  const fallbackOwnedCells = useMemo(() => {
    if (!isLoggedIn || !showMissingOnly || caughtSet.size === 0) return createEmptyPokemonGrid(GRID_SIZE);

    return buildFallbackOwnedCells({
      pokemon,
      gridCells: grid.cells,
      rowConstraints: grid.rowConstraints,
      colConstraints: grid.colConstraints,
      caughtSet,
      shinyPokemonKeyIds: new Set(remoteUserDex?.shinyPokemonKeyIds ?? []),
    });
  }, [caughtSet, grid.cells, grid.colConstraints, grid.rowConstraints, isLoggedIn, pokemon, remoteUserDex, showMissingOnly]);

  const swapOptionCounts = useMemo(() => {
    const result: number[][] = Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => 0));

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        result[row][col] = pokemonPool.filter(
          (entry) => matchesConstraint(entry, grid.rowConstraints[row]) && matchesConstraint(entry, grid.colConstraints[col]),
        ).length;
      }
    }

    return result;
  }, [grid.colConstraints, grid.rowConstraints, pokemonPool]);

  const totalSwapOptionCounts = useMemo(() => {
    const result: number[][] = Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => 0));

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        result[row][col] = pokemon.filter(
          (entry) => matchesConstraint(entry, grid.rowConstraints[row]) && matchesConstraint(entry, grid.colConstraints[col]),
        ).length;
      }
    }

    return result;
  }, [grid.colConstraints, grid.rowConstraints, pokemon]);

  const handleCellClick = (row: number, col: number, anchorElement?: HTMLDivElement | null) => {
    setSelectedCellAnchorElement(anchorElement ?? null);
    setGrid((prev) => ({ ...prev, selectedCell: [row, col] }));
  };

  const handlePokemonSelect = (selectedPokemon: Pokemon) => {
    if (!grid.selectedCell) return;
    setSelectedCellAnchorElement(null);
    const [row, col] = grid.selectedCell;
    setGrid((prev) => ({
      ...prev,
      cells: prev.cells.map((r, ri) =>
        ri === row
          ? r.map((cellValue, ci): Pokemon | null =>
              ci === col ? selectedPokemon : cellValue,
            )
          : r,
      ),
      selectedCell: null,
    }));
  };

  const handleConstraintChange = (
    index: number,
    isRow: boolean,
    option: { value: string; category: string } | null,
  ) => {
    const constraint = option
      ? { value: option.value, category: option.category }
      : null;
    setGrid((prev) => ({
      ...prev,
      [isRow ? "rowConstraints" : "colConstraints"]: prev[
        isRow ? "rowConstraints" : "colConstraints"
      ].map((c, i) => (i === index ? constraint : c)),
    }));
  };

  const clearGrid = () => {
    trackEvent("click_clear_all");
    setGrid(createEmptyGridState());
  };

  const hasGridData = grid.cells.some((row) =>
    row.some((cell) => cell !== null),
  );

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
      setUndoMarkOwnedState({
        previousUserDex: remoteUserDex,
        addedCount: ownedIds.filter((id) => !caughtSet.has(id)).length,
      });
      trackEvent("click_mark_all_completed", { count: ownedIds.length.toString() });
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

      setCaughtSet(new Set(undoMarkOwnedState.previousUserDex.caughtPokemonKeyIds));
      setRemoteUserDex(undoMarkOwnedState.previousUserDex);
      setUndoMarkOwnedState(null);
      trackEvent("click_undo_mark_owned", { count: undoMarkOwnedState.addedCount.toString() });
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

    trackEvent("update_grid_cell_dex_state", {
      pokemon_key_id: pokemonKeyId.toString(),
      caught: nextCaughtSet.has(pokemonKeyId) ? "true" : "false",
      shiny: nextShinySet.has(pokemonKeyId) ? "true" : "false",
    });
  }

  async function markSelectedPokemonOwned(pokemon: Pokemon) {
    await saveSelectedPokemonDexState(pokemon, { owned: !caughtSet.has(getPokemonKeyId(pokemon)) });
  }

  async function markSelectedPokemonShiny(pokemon: Pokemon) {
    await saveSelectedPokemonDexState(pokemon, { shiny: true });
  }

  function redirectToLogin() {
    trackEvent("click_navigate", { url: "login/", from: "custom_puzzle" });
    window.location.assign(`${import.meta.env.BASE_URL}login/`);
  }

  if (loading) {
    return (
      <div className="min-h-screen p-5 text-center">
        <p>Loading Pokémon data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-5">
      <Header
        title="Custom Puzzle"
        subtitle="Explore all valid Pokémon for any Pokedoku square. Set type, region, move, or ability constraints and click a cell to see matches."
        currentPage="tools"
      />

      <div className="flex flex-col items-center">
        {isLoggedIn ? (
          <PokedexFilterPanel
            showMissingOnly={showMissingOnly}
            onToggleMyPokedexFilter={() => {
              void toggleMyPokedexFilter();
            }}
            isSavingFilterPreference={isSavingFilterPreference}
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
          <PokedexPromoCard trackingFrom="custom_puzzle" />
        )}
      </div>

      <div className="flex flex-col items-center gap-1">
        <p className="text-[0.9rem] opacity-70">
          Select a category to begin
        </p>
        <div className="relative">
          <Grid
            cells={grid.cells}
            rowConstraints={grid.rowConstraints}
            colConstraints={grid.colConstraints}
            possiblePokemon={possiblePokemon}
            fallbackOwnedCells={fallbackOwnedCells}
            ownedPokemonKeyIds={caughtSet}
            shinyPokemonKeyIds={new Set(remoteUserDex?.shinyPokemonKeyIds ?? [])}
            selectedCell={grid.selectedCell}
            showSuggestedMeta
            showOwnedState={showMissingOnly}
            highlightSwapCount={showMissingOnly}
            singularHintCountLabel={showMissingOnly ? "new entry" : "valid answer"}
            pluralHintCountLabel={showMissingOnly ? "new entries" : "valid answers"}
            suggestedPokemonKeys={suggestedPokemonKeys}
            swapOptionCounts={swapOptionCounts}
            totalSwapOptionCounts={totalSwapOptionCounts}
            onCellClick={handleCellClick}
            onSwapClick={handleCellClick}
            onConstraintChange={handleConstraintChange}
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
            key={grid.selectedCell ? `${grid.selectedCell[0]}-${grid.selectedCell[1]}-${selectedCellDisplayPokemon ? "pokemon" : "open"}-${selectedCellHasPlacedPokemon ? "placed" : "fallback"}` : "closed"}
            selectedCell={grid.selectedCell}
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
        <InfoBox>Numbers show how many Pokémon match each combination.</InfoBox>
        <ActionButton
          onClick={clearGrid}
          variant="destructiveGhost"
          disabled={!hasGridData}
        >
          Clear All
        </ActionButton>
      </div>

      <ContentSection>
        <h2 className="mb-3 text-center text-[clamp(1.6rem,4vw,2rem)] font-bold leading-tight text-[var(--text-h)]">How it works</h2>

        <p className="mb-3.5 text-base leading-[1.7] text-[var(--text)]">
          Choose a constraint for each row and column, then click a square to
          view matching Pokémon. You can load today’s puzzle or create your own
          combinations to explore different possibilities.
        </p>

        <h2 className="mb-3 text-center text-[clamp(1.6rem,4vw,2rem)] font-bold leading-tight text-[var(--text-h)]">Why use this Pokedoku helper?</h2>

        <p className="mb-3.5 text-base leading-[1.7] text-[var(--text)]">
          Some squares have lots of possible answers, while others are much more
          restrictive than they look. This helper shows valid Pokémon for each
          combination so you can learn new options, avoid invalid guesses, and
          make better choices in the daily puzzle.
        </p>

        <h2 className="mb-3 text-center text-[clamp(1.6rem,4vw,2rem)] font-bold leading-tight text-[var(--text-h)]">Use it with today’s Pokedoku</h2>

        <p className="mb-3.5 text-base leading-[1.7] text-[var(--text)]">
          Tap <strong>Today&apos;s puzzle</strong> to load the current grid,
          then inspect each square to see which Pokémon fit. You can use it as a
          hint tool, a learning aid, or a quick way to understand difficult
          categories.
        </p>
      </ContentSection>

      <ContentSection className="faq">
        <h2 className="mb-3 text-center text-[clamp(1.6rem,4vw,2rem)] font-bold leading-tight text-[var(--text-h)]">FAQ</h2>

        <h3 className="mb-2 mt-6 text-[1.1rem] font-bold leading-[1.35] text-[var(--text-h)]">What is Pokedoku?</h3>

        <p className="mb-3.5 text-base leading-[1.7] text-[var(--text)]">
          Pokedoku is a daily puzzle where each square must be filled with a
          Pokémon that matches both the row and column categories.
        </p>

        <h3 className="mb-2 mt-6 text-[1.1rem] font-bold leading-[1.35] text-[var(--text-h)]">What does this helper do?</h3>

        <p className="mb-3.5 text-base leading-[1.7] text-[var(--text)]">
          It shows Pokémon that match the selected row and column constraints
          for a square, making it easier to explore valid options.
        </p>

        <h3 className="mb-2 mt-6 text-[1.1rem] font-bold leading-[1.35] text-[var(--text-h)]">What is Dex Difficulty?</h3>

        <p className="mb-3.5 text-base leading-[1.7] text-[var(--text)]">
          Dex Difficulty shows how hard it is to use a Pokémon in Pokedoku.
          <strong> Nightmare</strong> = few valid spots, lots of competition.
          <strong> Easy</strong> = more options or less competition. Helps you
          see which answers are.
        </p>

        <h3 className="mb-2 mt-6 text-[1.1rem] font-bold leading-[1.35] text-[var(--text-h)]">Can I use it for the daily puzzle?</h3>

        <p className="mb-3.5 text-base leading-[1.7] text-[var(--text)]">
          Yes. You can load the current puzzle and view possible matches for
          each square.
        </p>

        <h3 className="mb-2 mt-6 text-[1.1rem] font-bold leading-[1.35] text-[var(--text-h)]">What kinds of constraints can I explore?</h3>

        <p className="mb-3.5 text-base leading-[1.7] text-[var(--text)]">
          Depending on the puzzle, you can check combinations involving types,
          regions, generations, evolution lines, legendary status, and other
          common Pokedoku categories.
        </p>
      </ContentSection>

      <Footer />
    </div>
  );
}

export default App;
