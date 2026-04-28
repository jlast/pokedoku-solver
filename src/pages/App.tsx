import { useState, useMemo, useEffect, useRef } from "react";
import type { Pokemon } from "../utils/types";
import { GRID_SIZE } from "../utils/constants";
import { matchesConstraint, findConstraintOption, type Constraint } from "../utils/filters";
import { trackEvent } from "../utils/analytics";
import { Grid } from "../components/Grid";
import { Header } from "../components/Header";
import { SuggestionsPanel } from "../components/SuggestionsPanel";
import "./App.css";
import "../index.css";

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

function App() {
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [grid, setGrid] = useState<GridState>(() => {
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
  });

  const suggestionsRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!grid.selectedCell || !suggestionsRef.current) return;

    const el = suggestionsRef.current;
    const rect = el.getBoundingClientRect();

    const isInView = rect.top >= 0 && rect.bottom <= window.innerHeight;

    if (!isInView) {
      setTimeout(() => {
        el.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
    }
  }, [grid.selectedCell]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}pokemon.json?t=${Date.now()}`)
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
    const params = new URLSearchParams(window.location.search);
    const toQueryString = (constraints: (Constraint | null)[]): string =>
      constraints
        .map((c) => c?.value || "")
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
    setGrid({
      cells: Array(GRID_SIZE)
        .fill(null)
        .map(() => Array(GRID_SIZE).fill(null)),
      rowConstraints: [null, null, null],
      colConstraints: [null, null, null],
      selectedCell: null,
    });
  };

  const hasGridData = grid.cells.some((row) =>
    row.some((cell) => cell !== null),
  );

  const handleNavigate = (url: string) => {
    trackEvent("click_navigate", { url });
    window.location.href = `${import.meta.env.BASE_URL}${url}`;
  };

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
        title="Pokedoku Helper"
        subtitle="Explore all valid Pokémon for any Pokedoku square. Set constraints and click a cell to see matching Pokémon."
      />

      <div className="controls">
        <button onClick={() => handleNavigate("today/")} className="nav-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7v-5z" />
          </svg>
          Today's Puzzle
        </button>
        <button
          onClick={() => handleNavigate("pokemon-list/")}
          className="nav-btn"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z" />
          </svg>
          All Pokemon
        </button>
      </div>

      <div className="main-content">
        <p style={{ fontSize: "0.9rem", opacity: 0.7 }}>
          Select a category to begin
        </p>
        <Grid
          cells={grid.cells}
          rowConstraints={grid.rowConstraints}
          colConstraints={grid.colConstraints}
          possiblePokemon={possiblePokemon}
          selectedCell={grid.selectedCell}
          onCellClick={handleCellClick}
          onConstraintChange={handleConstraintChange}
        />
        <p style={{ fontSize: "0.9rem", opacity: 0.7 }}>
          <i>Numbers show how many Pokémon match each combination.</i>
        </p>
        <button
          onClick={clearGrid}
          className="clear-btn"
          disabled={!hasGridData}
        >
          Clear All
        </button>
        <div ref={suggestionsRef}>
          <SuggestionsPanel
            selectedCell={grid.selectedCell}
            possiblePokemon={selectedCellPossible}
            onSelect={handlePokemonSelect}
          />
        </div>
      </div>

      <section className="content-section">
        <h2>How it works</h2>

        <p>
          Choose a constraint for each row and column, then click a square to
          view matching Pokémon. You can load today’s puzzle or create your own
          combinations to explore different possibilities.
        </p>

        <h2>Why use this Pokedoku helper?</h2>

        <p>
          Some squares have lots of possible answers, while others are much more
          restrictive than they look. This helper shows valid Pokémon for each
          combination so you can learn new options, avoid invalid guesses, and
          make better choices in the daily puzzle.
        </p>

        <h2>Use it with today’s Pokedoku</h2>

        <p>
          Tap <strong>Today&apos;s puzzle</strong> to load the current grid,
          then inspect each square to see which Pokémon fit. You can use it as a
          hint tool, a learning aid, or a quick way to understand difficult
          categories.
        </p>
      </section>

      <section className="content-section faq">
        <h2>FAQ</h2>

        <h3>What is Pokedoku?</h3>

        <p>
          Pokedoku is a daily puzzle where each square must be filled with a
          Pokémon that matches both the row and column categories.
        </p>

        <h3>What does this helper do?</h3>

        <p>
          It shows Pokémon that match the selected row and column constraints
          for a square, making it easier to explore valid options.
        </p>

        <h3>What is Dex Difficulty?</h3>

        <p>
          Dex Difficulty shows how hard it is to use a Pokémon in Pokedoku.
          <strong> Nightmare</strong> = few valid spots, lots of competition.
          <strong> Easy</strong> = more options or less competition. Helps you
          see which answers are.
        </p>

        <h3>Can I use it for the daily puzzle?</h3>

        <p>
          Yes. You can load the current puzzle and view possible matches for
          each square.
        </p>

        <h3>What kinds of constraints can I explore?</h3>

        <p>
          Depending on the puzzle, you can check combinations involving types,
          regions, generations, evolution lines, legendary status, and other
          common Pokedoku categories.
        </p>
      </section>

      <footer>
        <a
          href="https://pokedoku.com"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            trackEvent("click_pokedoku", { url: "https://pokedoku.com" })
          }
        >
          Play Pokedoku
        </a>
        <span>•</span>
        <a
          href="https://github.com/jlast/pokedoku-solver/issues"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            trackEvent("click_report_issues", {
              url: "https://github.com/jlast/pokedoku-solver/issues",
            })
          }
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Report Issues
        </a>
        <span>•</span>
        <a
          href="https://www.reddit.com/user/pokedoku-solver/"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            trackEvent("click_reddit", {
              url: "https://www.reddit.com/user/pokedoku-solver/",
            })
          }
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.76.786 1.76 1.76 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.348 1.348 0 0 1 4.527 16.5c0-.968.792-1.76 1.76-1.76.476 0 .899.182 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.012l2.906.547a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
          </svg>
          u/pokedoku-solver
        </a>
      </footer>
    </div>
  );
}

export default App;
