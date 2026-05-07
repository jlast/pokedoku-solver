import { useEffect, useMemo, useRef, useState } from "react";
import type { Pokemon } from "@pokedoku-helper/shared-types";
import { trackEvent } from "../../../../lib/browser/analytics";
import { InfoBox } from "../components/InfoBox";
import { Grid } from "../components/Grid";
import { SuggestionsPanel } from "../components/SuggestionsPanel";
import { matchesConstraint, type Constraint } from "../../../../lib/shared/filters";

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

      <button onClick={clearCells} className="clear-btn" disabled={!hasGridData}>Clear selected Pokemon</button>

      <div className="mt-2 text-center">
        <a
          href={`${import.meta.env.BASE_URL}custom/`}
          className="text-sm font-medium text-slate-600 hover:text-slate-900 underline"
          onClick={() => trackEvent("click_navigate", { url: "custom/", from: "today_suggestions" })}
        >
          Need a different board? Open Custom puzzle
        </a>
      </div>
    </div>
  );
}
