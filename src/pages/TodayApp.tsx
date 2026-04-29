import { useState, useMemo, useEffect, useRef } from "react";
import type { Pokemon } from "../utils/types";
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
  bonus?: boolean;
  size?: number;
  rowConstraints: Constraint[];
  colConstraints: Constraint[];
}

interface TodayAppProps {
  puzzles: TodayPuzzle[];
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
      const rowConstraint = rowConstraints[row];
      const colConstraint = colConstraints[col];

      candidatesByCell[row][col] = pokemon
        .filter((p) => matchesConstraint(p, rowConstraint) && matchesConstraint(p, colConstraint))
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
  })).sort(
    (a, b) =>
      candidatesByCell[a.row][a.col].length - candidatesByCell[b.row][b.col].length,
  );

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

export function TodayApp({ puzzles }: TodayAppProps) {
  const regularPuzzle = useMemo(
    () => puzzles.find((p) => p.type !== "BONUS") ?? puzzles[0],
    [puzzles],
  );
  const bonusPuzzle = useMemo(
    () => puzzles.find((p) => p.type === "BONUS"),
    [puzzles],
  );
  const [activeTab, setActiveTab] = useState<"today" | "bonus">("today");
  const activePuzzle = activeTab === "bonus" && bonusPuzzle ? bonusPuzzle : regularPuzzle;
  const gridSize = activePuzzle.rowConstraints.length;
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [grid, setGrid] = useState<GridState>(() => ({
    cells: Array(gridSize)
      .fill(null)
      .map(() => Array(gridSize).fill(null)),
    rowConstraints: [...activePuzzle.rowConstraints],
    colConstraints: [...activePuzzle.colConstraints],
    selectedCell: null,
  }));
  const [suggestedPokemonKeys, setSuggestedPokemonKeys] = useState<(string | null)[][]>(
    () =>
      Array(gridSize)
        .fill(null)
        .map(() => Array(gridSize).fill(null)),
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
    if (!bonusPuzzle && activeTab === "bonus") {
      setActiveTab("today");
    }
  }, [bonusPuzzle, activeTab]);

  useEffect(() => {
    const freshCells = Array(gridSize)
      .fill(null)
      .map(() => Array(gridSize).fill(null));

    if (pokemon.length === 0) {
      setGrid({
        cells: freshCells,
        rowConstraints: [...activePuzzle.rowConstraints],
        colConstraints: [...activePuzzle.colConstraints],
        selectedCell: null,
      });
      setSuggestedPokemonKeys(
        Array(gridSize)
          .fill(null)
          .map(() => Array(gridSize).fill(null)),
      );
      return;
    }

    const { cells, suggestedKeys } = buildSuggestedCells(
      pokemon,
      activePuzzle.rowConstraints,
      activePuzzle.colConstraints,
    );

    setGrid({
      cells,
      rowConstraints: [...activePuzzle.rowConstraints],
      colConstraints: [...activePuzzle.colConstraints],
      selectedCell: null,
    });
    setSuggestedPokemonKeys(suggestedKeys);
  }, [activePuzzle, gridSize, pokemon]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/pokemon.json`)
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

  const possiblePokemon = useMemo(() => {
    const result: Pokemon[][][] = Array(gridSize)
      .fill(null)
      .map(() =>
        Array(gridSize)
          .fill(null)
          .map(() => [] as Pokemon[]),
      );

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
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
  }, [grid, pokemon, gridSize]);

  const swapOptionCounts = useMemo(() => {
    const result: number[][] = Array(gridSize)
      .fill(null)
      .map(() => Array(gridSize).fill(0));

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
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
  }, [grid.rowConstraints, grid.colConstraints, pokemon, gridSize]);

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
      cells: Array(gridSize)
        .fill(null)
        .map(() => Array(gridSize).fill(null)),
      selectedCell: null,
    }));
  };

  const hasGridData = grid.cells.some(row => row.some(cell => cell !== null));

  const selectedCellPossible = useMemo(() => {
    if (!grid.selectedCell) return [];

    const [row, col] = grid.selectedCell;

    const rowConstraint = grid.rowConstraints[row];
    const colConstraint = grid.colConstraints[col];

    return pokemon.filter((p) => {
      if (!matchesConstraint(p, rowConstraint)) return false;
      if (!matchesConstraint(p, colConstraint)) return false;
      return true;
    });
  }, [grid.selectedCell, grid.rowConstraints, grid.colConstraints, pokemon]);

  if (loading) {
    return (
      <div className="app loading">
        <p>Loading Pokémon data...</p>
      </div>
    );
  }

  return (
    <div className="app">
        <Header
          title="Today's Answers"
          subtitle={`Suggested answers for today's Pokedoku ${activePuzzle.bonus ? "bonus " : ""}puzzle. Multiple Pokémon will fit each square, so tap any pick to see alternatives.`}
          showDate={formatDate(activePuzzle.date)}
          currentPage="today"
        />

      {bonusPuzzle && (
        <div className="today-puzzle-toggle" role="tablist" aria-label="Choose puzzle">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "today"}
            className={`today-puzzle-tab ${activeTab === "today" ? "active" : ""}`}
            onClick={() => {
              trackEvent("click_today_toggle", { tab: "today" });
              setActiveTab("today");
            }}
          >
            Today Puzzle
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "bonus"}
            className={`today-puzzle-tab ${activeTab === "bonus" ? "active" : ""}`}
            onClick={() => {
              trackEvent("click_today_toggle", { tab: "bonus" });
              setActiveTab("bonus");
            }}
          >
            <span className="today-puzzle-tab-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M20 7h-2.18A2.99 2.99 0 0 0 18 6a3 3 0 0 0-5.5-1.66L12 5l-.5-.66A3 3 0 0 0 6 6c0 .35.06.69.18 1H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7h1a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1ZM9 5a1 1 0 0 1 .8.4L10.75 7H9A1 1 0 0 1 9 5Zm6 0a1 1 0 0 1 0 2h-1.75l.95-1.6A1 1 0 0 1 15 5ZM5 9h6v2H5V9Zm2 4h4v5H7v-5Zm6 5v-5h4v5h-4Zm6-7h-6V9h6v2Z" />
              </svg>
            </span>
            Bonus Puzzle
          </button>
        </div>
      )}

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
