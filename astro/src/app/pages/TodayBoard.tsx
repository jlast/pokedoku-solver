import { useEffect, useMemo, useRef, useState } from "react";
import type { Pokemon } from "@pokedoku-helper/shared-types";
import { trackEvent } from "../../../../lib/browser/analytics";
import { DEX_DIFFICULTY_COLORS } from "../../../../lib/shared/constants";
import { InfoBox } from "../components/InfoBox";
import { Grid } from "../components/Grid";
import { SuggestionsPanel } from "../components/SuggestionsPanel";
import { matchesConstraint, type Constraint } from "../../../../lib/shared/filters";
import { CategoryBadgeLink } from "../components/shared/CategoryBadgeLink";
import { parseCategoryId } from "../components/puzzle-stats/categoryUtils";
import { slugify } from "../../lib/slug";

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

const DIFFICULTY_RANK: Record<string, number> = {
  Easy: 0,
  Normal: 1,
  Hard: 2,
  Expert: 3,
  Nightmare: 4,
  Impossible: 5,
};

function compareByHardest(a: Pokemon, b: Pokemon): number {
  const aDifficulty = a.dexDifficulty ? DIFFICULTY_RANK[a.dexDifficulty] ?? -1 : -1;
  const bDifficulty = b.dexDifficulty ? DIFFICULTY_RANK[b.dexDifficulty] ?? -1 : -1;
  if (aDifficulty !== bDifficulty) return bDifficulty - aDifficulty;
  const aPercentile = a.dexDifficultyPercentile ?? Number.POSITIVE_INFINITY;
  const bPercentile = b.dexDifficultyPercentile ?? Number.POSITIVE_INFINITY;
  if (aPercentile !== bPercentile) return bPercentile - aPercentile;
  return a.id - b.id;
}

function buildSuggestedCells(
  pokemon: Pokemon[],
  rowConstraints: (Constraint | null)[],
  colConstraints: (Constraint | null)[],
): { cells: (Pokemon | null)[][]; suggestedKeys: (string | null)[][] } {
  const gridSize = rowConstraints.length;
  const candidatesByCell: Pokemon[][][] = Array(gridSize)
    .fill(null)
    .map(() => Array(gridSize).fill(null).map(() => [] as Pokemon[]));

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      candidatesByCell[row][col] = pokemon
        .filter((p) => matchesConstraint(p, rowConstraints[row]) && matchesConstraint(p, colConstraints[col]))
        .sort(compareByHardest);
    }
  }

  const rowUsed = Array.from({ length: gridSize }, () => new Set<number>());
  const colUsed = Array.from({ length: gridSize }, () => new Set<number>());
  const suggestedCells: (Pokemon | null)[][] = Array(gridSize)
    .fill(null)
    .map(() => Array(gridSize).fill(null));

  const cellOrder = Array.from({ length: gridSize * gridSize }, (_, index) => ({
    row: Math.floor(index / gridSize),
    col: index % gridSize,
  })).sort((a, b) => candidatesByCell[a.row][a.col].length - candidatesByCell[b.row][b.col].length);

  for (const { row, col } of cellOrder) {
    const candidates = candidatesByCell[row][col];
    if (candidates.length === 0) continue;
    const uniqueCandidate = candidates.find(
      (candidate) => !rowUsed[row].has(candidate.id) && !colUsed[col].has(candidate.id),
    );
    const pick = uniqueCandidate ?? candidates[0];
    suggestedCells[row][col] = pick;
    rowUsed[row].add(pick.id);
    colUsed[col].add(pick.id);
  }

  return {
    cells: suggestedCells,
    suggestedKeys: suggestedCells.map((row) => row.map((cell) => (cell ? cell.sprite || cell.name : null))),
  };
}

export function TodayBoard({ puzzle }: { puzzle: TodayPuzzle }) {
  const gridSize = puzzle.rowConstraints.length;
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [grid, setGrid] = useState<GridState>(() => ({
    cells: Array(gridSize).fill(null).map(() => Array(gridSize).fill(null)),
    rowConstraints: [...puzzle.rowConstraints],
    colConstraints: [...puzzle.colConstraints],
    selectedCell: null,
  }));
  const [suggestedPokemonKeys, setSuggestedPokemonKeys] = useState<(string | null)[][]>(
    () => Array(gridSize).fill(null).map(() => Array(gridSize).fill(null)),
  );
  const suggestionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!grid.selectedCell || !suggestionsRef.current) return;
    const el = suggestionsRef.current;
    const rect = el.getBoundingClientRect();
    const isPartiallyInView = rect.bottom > 0 && rect.top < window.innerHeight;
    if (!isPartiallyInView) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }, [grid.selectedCell]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/pokemon.json`)
      .then((res) => res.json())
      .then((data) => {
        setPokemon(data);
        const { cells, suggestedKeys } = buildSuggestedCells(data, puzzle.rowConstraints, puzzle.colConstraints);
        setSuggestedPokemonKeys(suggestedKeys);
        setGrid((prev) => ({ ...prev, cells }));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load Pokemon:", err);
        setLoading(false);
      });
  }, [puzzle.colConstraints, puzzle.rowConstraints]);

  const possiblePokemon = useMemo(() => {
    const result: Pokemon[][][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null).map(() => [] as Pokemon[]));
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (grid.cells[row][col] !== null) {
          result[row][col] = [grid.cells[row][col]!];
          continue;
        }
        const candidates = pokemon.filter((p) => {
          if (!matchesConstraint(p, grid.rowConstraints[row])) return false;
          if (!matchesConstraint(p, grid.colConstraints[col])) return false;
          return true;
        });
        result[row][col] = candidates;
      }
    }
    return result;
  }, [grid, pokemon, gridSize]);

  const swapOptionCounts = useMemo(() => {
    const result: number[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(0));
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        result[row][col] = pokemon.filter((p) => matchesConstraint(p, grid.rowConstraints[row]) && matchesConstraint(p, grid.colConstraints[col])).length;
      }
    }
    return result;
  }, [grid.rowConstraints, grid.colConstraints, pokemon, gridSize]);

  const handleCellClick = (row: number, col: number) => {
    setGrid((prev) => {
      const isSameCell = prev.selectedCell?.[0] === row && prev.selectedCell?.[1] === col;
      return { ...prev, selectedCell: isSameCell ? null : [row, col] };
    });
  };

  const handlePokemonSelect = (selectedPokemon: Pokemon) => {
    if (!grid.selectedCell) return;
    const [row, col] = grid.selectedCell;
    setGrid((prev) => ({
      ...prev,
      cells: prev.cells.map((r, ri) => (ri === row ? r.map((cellValue, ci) => (ci === col ? selectedPokemon : cellValue)) : r)),
      selectedCell: null,
    }));
  };

  const clearCells = () => {
    trackEvent("click_clear_all");
    setGrid((prev) => ({
      ...prev,
      cells: Array(gridSize).fill(null).map(() => Array(gridSize).fill(null)),
      selectedCell: null,
    }));
  };

  const hasGridData = grid.cells.some((row) => row.some((cell) => cell !== null));
  const selectedCellPossible = useMemo(() => {
    if (!grid.selectedCell) return [];
    const [row, col] = grid.selectedCell;
    return pokemon.filter((p) => matchesConstraint(p, grid.rowConstraints[row]) && matchesConstraint(p, grid.colConstraints[col]));
  }, [grid.selectedCell, grid.rowConstraints, grid.colConstraints, pokemon]);

  const textualSuggestions = useMemo(() => {
    const entries: {
      key: string;
      category: string;
      pokemon: Pokemon | null;
    }[] = [];

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        entries.push({
          key: `${row}-${col}`,
          category: `${grid.rowConstraints[row]?.value ?? "Any"} + ${grid.colConstraints[col]?.value ?? "Any"}`,
          pokemon: grid.cells[row][col],
        });
      }
    }

    return entries;
  }, [grid.cells, grid.colConstraints, grid.rowConstraints, gridSize]);

  if (loading) return <div className="app loading text-center"><p>Loading Pokemon data...</p></div>;

  return (
    <div className="main-content">
      <Grid
        cells={grid.cells}
        rowConstraints={grid.rowConstraints}
        colConstraints={grid.colConstraints}
        possiblePokemon={possiblePokemon}
        suggestedPokemonKeys={suggestedPokemonKeys}
        swapOptionCounts={swapOptionCounts}
        selectedCell={grid.selectedCell}
        editable={false}
        showSuggestedMeta
        onCellClick={handleCellClick}
        onSwapClick={handleCellClick}
        onConstraintChange={() => {}}
      />
      <InfoBox>These are strategic Pokedoku answers that prioritize harder-to-place Pokemon for Pokedex completion. Tap a square for all options.</InfoBox>
      <div ref={suggestionsRef}>
        <SuggestionsPanel
          selectedCell={grid.selectedCell}
          possiblePokemon={selectedCellPossible}
          onSelect={handlePokemonSelect}
        />
      </div>

      <div className="today-actions">
        <button
          onClick={clearCells}
          className="clear-btn clear-btn--ghost-destructive"
          disabled={!hasGridData}
        >
          Clear selected Pokemon
        </button>
        <a
          href={`${import.meta.env.BASE_URL}custom/`}
          className="filter-btn-secondary"
          onClick={() => trackEvent("click_navigate", { url: "custom/", from: "today_suggestions" })}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Try another board
        </a>
      </div>

      <section className="mt-8" aria-labelledby="today-text-suggestions-heading">
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] sm:p-5">
          <h2 id="today-text-suggestions-heading" className="text-base font-semibold text-slate-900">
            Today&apos;s Suggested Answers
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 text-slate-900">
                  <th className="px-2 py-3 pr-6 font-semibold">Category</th>
                  <th className="px-2 py-3 pr-6 font-semibold">Pokemon</th>
                  <th className="px-2 py-3 font-semibold">Types &amp; Difficulty</th>
                </tr>
              </thead>
              <tbody>
                {textualSuggestions.map((entry) => (
                  <tr key={entry.key} className="border-b border-slate-100 align-top">
                    <td className="px-2 py-3 pr-6">{entry.category}</td>
                    <td className="px-2 py-3">{entry.pokemon ? <span>{entry.pokemon.name}</span> : <span>No suggestion available</span>}</td>
                    <td className="px-2 py-3">
                      {entry.pokemon ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {entry.pokemon.dexDifficulty && (
                            <span
                              className="inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold leading-none text-white shadow-sm"
                              style={{
                                backgroundColor: DEX_DIFFICULTY_COLORS[entry.pokemon.dexDifficulty],
                                border: "1px solid rgba(15,23,42,0.12)",
                              }}
                            >
                              {entry.pokemon.dexDifficulty}
                            </span>
                          )}
                          <div className="flex flex-wrap items-center gap-1">
                            {entry.pokemon.types.map((type, i) => (
                              <CategoryBadgeLink
                                key={`${entry.key}-${type}-${i}`}
                                parsed={parseCategoryId(`types:${type}`)}
                                href={`${import.meta.env.BASE_URL}category/${slugify(type)}/`}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
