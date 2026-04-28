import { useState, useMemo, useEffect, useRef } from "react";
import type { Pokemon } from "../utils/types";
import { GRID_SIZE } from "../utils/constants";
import { formatDate } from "../utils/utils";
import { trackEvent } from "../utils/analytics";
import { Grid } from "../components/Grid";
import { Header } from "../components/Header";
import { SuggestionsPanel } from "../components/SuggestionsPanel";
import { Footer } from "../components/Footer";
import { InfoBox } from "../components/InfoBox";
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

        const candidates = pokemon.filter((p) => {
          if (usedInRow.has(p.id) || usedInCol.has(p.id)) return false;
          if (!matchesConstraint(p, rowConstraint)) return false;
          if (!matchesConstraint(p, colConstraint)) return false;
          return true;
        });

        result[row][col] = candidates;
      }
    }

    return result;
  }, [grid, pokemon]);

  const handleCellClick = (row: number, col: number) => {
    const cell = grid.cells[row][col];
    if (cell) {
      setGrid((prev) => ({
        ...prev,
        cells: prev.cells.map((r, ri) =>
          ri === row
            ? r.map((cellValue, ci): Pokemon | null =>
                ci === col ? null : cellValue,
              )
            : r,
        ),
        selectedCell: null,
      }));
    } else {
      setGrid((prev) => ({ ...prev, selectedCell: [row, col] }));
    }
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

  const selectedCellPossible = grid.selectedCell
    ? possiblePokemon[grid.selectedCell[0]][grid.selectedCell[1]]
    : [];

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
        subtitle="See the categories for today's Pokedoku puzzle and explore possible Pokémon for each square."
        showDate={formatDate(puzzle.date)}
        currentPage="today"
      />

      <div className="main-content">
        <p style={{ fontSize: "0.9rem", opacity: 0.7 }}>
          Tap a square to see matching Pokémon
        </p>
        <Grid
          cells={grid.cells}
          rowConstraints={grid.rowConstraints}
          colConstraints={grid.colConstraints}
          possiblePokemon={possiblePokemon}
          selectedCell={grid.selectedCell}
          editable={false}
          onCellClick={handleCellClick}
          onConstraintChange={() => {}}
        />
        <InfoBox>Numbers show how many Pokémon match each combination.</InfoBox>
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
