import { useState, useMemo, useEffect, useRef } from "react";
import type { Pokemon } from "../utils/types";
import { GRID_SIZE } from "../utils/constants";
import { formatDate } from "../utils/utils";
import { trackEvent } from "../utils/analytics";
import { InfoBox } from "../components/InfoBox";
import { Grid } from "../components/Grid";
import { Header } from "../components/Header";
import { SuggestionsPanel } from "../components/SuggestionsPanel";
import { Footer } from "../components/Footer";
import "./App.css";
import "../index.css";
import { matchesConstraint, type Constraint } from "../utils/filters";

export interface TodayPuzzle {
  date: string;
  type: string;
  rowConstraints: Constraint[];
  colConstraints: Constraint[];
}

interface TodayAppProps {
  puzzle: TodayPuzzle;
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

  if (aDifficulty !== bDifficulty) {
    return bDifficulty - aDifficulty;
  }

  const aPercentile = a.dexDifficultyPercentile ?? Number.POSITIVE_INFINITY;
  const bPercentile = b.dexDifficultyPercentile ?? Number.POSITIVE_INFINITY;

  if (aPercentile !== bPercentile) {
    return bPercentile - aPercentile;
  }

  return a.id - b.id;
}

export function TodayApp({ puzzle }: TodayAppProps) {
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [grid, setGrid] = useState<GridState>(() => ({
    cells: Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill(null)),
    rowConstraints: [...puzzle.rowConstraints],
    colConstraints: [...puzzle.colConstraints],
    selectedCell: null,
  }));
  const [suggestedPokemonKeys, setSuggestedPokemonKeys] = useState<(string | null)[][]>(
    () =>
      Array(GRID_SIZE)
        .fill(null)
        .map(() => Array(GRID_SIZE).fill(null)),
  );
  const suggestionsRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!grid.selectedCell || !suggestionsRef.current) return;

    const el = suggestionsRef.current;
    const rect = el.getBoundingClientRect();

    const isPartiallyInView = rect.bottom > 0 && rect.top < window.innerHeight;

    if (!isPartiallyInView) {
      setTimeout(() => {
        el.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
    }
  }, [grid.selectedCell]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}pokemon.json`)
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
    if (pokemon.length === 0) return;

    setGrid((prev) => {
      const hasAnySelected = prev.cells.some((row) => row.some((cell) => cell !== null));
      if (hasAnySelected) return prev;

      const candidatesByCell: Pokemon[][][] = Array(GRID_SIZE)
        .fill(null)
        .map(() => Array(GRID_SIZE).fill(null).map(() => [] as Pokemon[]));

      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          const rowConstraint = prev.rowConstraints[row];
          const colConstraint = prev.colConstraints[col];

          candidatesByCell[row][col] = pokemon
            .filter((p) => matchesConstraint(p, rowConstraint) && matchesConstraint(p, colConstraint))
            .sort(compareByHardest);
        }
      }

      const rowUsed = Array.from({ length: GRID_SIZE }, () => new Set<number>());
      const colUsed = Array.from({ length: GRID_SIZE }, () => new Set<number>());
      const suggestedCells: (Pokemon | null)[][] = Array(GRID_SIZE)
        .fill(null)
        .map(() => Array(GRID_SIZE).fill(null));

      const cellOrder = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => ({
        row: Math.floor(index / GRID_SIZE),
        col: index % GRID_SIZE,
      })).sort(
        (a, b) =>
          candidatesByCell[a.row][a.col].length - candidatesByCell[b.row][b.col].length,
      );

      for (const { row, col } of cellOrder) {
        const candidates = candidatesByCell[row][col];
        if (candidates.length === 0) continue;

        const uniqueCandidate = candidates.find(
          (candidate) =>
            !rowUsed[row].has(candidate.id) && !colUsed[col].has(candidate.id),
        );

        const pick = uniqueCandidate ?? candidates[0];

        suggestedCells[row][col] = pick;
        rowUsed[row].add(pick.id);
        colUsed[col].add(pick.id);
      }

      setSuggestedPokemonKeys(
        suggestedCells.map((row) => row.map((cell) => (cell ? cell.sprite || cell.name : null))),
      );

      return {
        ...prev,
        cells: suggestedCells,
      };
    });
  }, [pokemon]);

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

        const rowConstraint = grid.rowConstraints[row];
        const colConstraint = grid.colConstraints[col];

        const candidates = pokemon.filter((p) => {
          if (!matchesConstraint(p, rowConstraint)) return false;
          if (!matchesConstraint(p, colConstraint)) return false;
          return true;
        });

        result[row][col] = candidates;
      }
    }

    return result;
  }, [grid, pokemon]);

  const swapOptionCounts = useMemo(() => {
    const result: number[][] = Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill(0));

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const _usedInRow = new Set(
          grid.cells[row]
            .filter((p, colIndex): p is Pokemon => p !== null && colIndex !== col)
            .map((p) => p.id),
        );

        const _usedInCol = new Set(
          grid.cells
            .map((rowValues, rowIndex) => (rowIndex === row ? null : rowValues[col]))
            .filter((p): p is Pokemon => p !== null)
            .map((p) => p.id),
        );

        const rowConstraint = grid.rowConstraints[row];
        const colConstraint = grid.colConstraints[col];

        result[row][col] = pokemon.filter((p) => {
          if (!matchesConstraint(p, rowConstraint)) return false;
          if (!matchesConstraint(p, colConstraint)) return false;
          return true;
        }).length;
      }
    }

    return result;
  }, [grid.cells, grid.rowConstraints, grid.colConstraints, pokemon]);

  const handleCellClick = (row: number, col: number) => {
    setGrid((prev) => {
      const isSameCell =
        prev.selectedCell?.[0] === row && prev.selectedCell?.[1] === col;

      return {
        ...prev,
        selectedCell: isSameCell ? null : [row, col],
      };
    });
  };

  const handlePokemonSelect = (selectedPokemon: Pokemon) => {
    if (!grid.selectedCell) return;
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

  const clearCells = () => {
    trackEvent("click_clear_all");
    setGrid((prev) => ({
      ...prev,
      cells: Array(GRID_SIZE)
        .fill(null)
        .map(() => Array(GRID_SIZE).fill(null)),
      selectedCell: null,
    }));
  };

  const hasGridData = grid.cells.some(row => row.some(cell => cell !== null));

  const selectedCellPossible = useMemo(() => {
    if (!grid.selectedCell) return [];

    const [row, col] = grid.selectedCell;

    const _usedInRow = new Set(
      grid.cells[row]
        .filter((p, colIndex): p is Pokemon => p !== null && colIndex !== col)
        .map((p) => p.id),
    );

    const _usedInCol = new Set(
      grid.cells
        .map((rowValues, rowIndex) => (rowIndex === row ? null : rowValues[col]))
        .filter((p): p is Pokemon => p !== null)
        .map((p) => p.id),
    );

    const rowConstraint = grid.rowConstraints[row];
    const colConstraint = grid.colConstraints[col];

    return pokemon.filter((p) => {
      if (!matchesConstraint(p, rowConstraint)) return false;
      if (!matchesConstraint(p, colConstraint)) return false;
      return true;
    });
  }, [grid.selectedCell, grid.cells, grid.rowConstraints, grid.colConstraints, pokemon]);

  if (loading) {
    return (
      <div className="app loading">
        <p>Loading PokÃ©mon data...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        title="Today's Answers"
        subtitle="Suggested answers for today's Pokedoku puzzle. Multiple PokÃ©mon will fit each square, so tap any pick to see alternatives."
        showDate={formatDate(puzzle.date)}
        currentPage="today"
      />

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
        <InfoBox>These are suggested Pokedoku answers highlighting rarer, harder Pokémon. Tap a square for all options.</InfoBox>
        <div ref={suggestionsRef}>
          <SuggestionsPanel
            selectedCell={grid.selectedCell}
            possiblePokemon={selectedCellPossible}
            onSelect={handlePokemonSelect}
          />
        </div>

        <button onClick={clearCells} className="clear-btn" disabled={!hasGridData}>Clear selected Pokémon</button>
      </div>

      <section className="content-section">
        <h2>Today&apos;s Pokedoku categories</h2>

        <p>
          This page automatically loads the current Pokedoku puzzle constraints
          so you can inspect every square and see which Pokémon fit. It updates
          each day with the latest puzzle.
        </p>
      </section>

      <section className="content-section faq">
        <h2>FAQ</h2>

        <h3>What is shown on this page?</h3>

        <p>
          This page loads today&apos;s Pokedoku categories and shows possible
          Pokémon matches for each square.
        </p>

        <h3>Does this update automatically?</h3>

        <p>Yes. It is designed to load the current daily Pokedoku puzzle.</p>

        <h3>Can I go back to manual editing?</h3>

        <p>
          Yes. Use the back button to return to the editor and set your own row
          and column combinations.
        </p>

        <h3>What is Dex Difficulty?</h3>

        <p>
          Dex Difficulty shows how hard it is to use a Pokémon in Pokedoku.
          <strong> Nightmare</strong> = few valid spots, lots of competition.
          <strong> Easy</strong> = more options or less competition. Helps you
          see which answers are more logical to prioritize for dex completion.
        </p>
      </section>

      <Footer />
    </div>
  );
}
