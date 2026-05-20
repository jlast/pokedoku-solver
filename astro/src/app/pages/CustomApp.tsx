import { useState, useMemo, useEffect, useRef } from "react";
import type { Pokemon } from "@pokedoku-helper/shared-types";
import { GRID_SIZE } from "../../../../lib/shared/constants";
import { matchesConstraint, findConstraintOption, type Constraint } from "../../../../lib/shared/filters";
import { trackEvent } from "../../../../lib/browser/analytics";
import { Grid } from "../components/Grid";
import { Header } from "../components/Header";
import { SuggestionsPanel } from "../components/SuggestionsPanel";
import { Footer } from "../components/Footer";
import { InfoBox } from "../components/InfoBox";
import { ContentSection } from "../components/shared/ContentSection";
import { ActionButton } from "../components/shared/ActionButton";

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
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [grid, setGrid] = useState<GridState>(createInitialGridState);

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
    setGrid(createEmptyGridState());
  };

  const hasGridData = grid.cells.some((row) =>
    row.some((cell) => cell !== null),
  );

  const selectedCellPossible = grid.selectedCell
    ? possiblePokemon[grid.selectedCell[0]][grid.selectedCell[1]]
    : [];

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
        currentPage="custom"
      />

      <div className="flex flex-col items-center gap-1">
        <p className="text-[0.9rem] opacity-70">
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
        <InfoBox>Numbers show how many Pokémon match each combination.</InfoBox>
        <ActionButton
          onClick={clearGrid}
          variant="destructiveGhost"
          disabled={!hasGridData}
        >
          Clear All
        </ActionButton>
        <div ref={suggestionsRef}>
          <SuggestionsPanel
            selectedCell={grid.selectedCell}
            possiblePokemon={selectedCellPossible}
            onSelect={handlePokemonSelect}
          />
        </div>
      </div>

      <ContentSection>
        <h2 className="mb-3 text-center text-[clamp(1.6rem,4vw,2rem)] font-bold leading-tight text-[#222]">How it works</h2>

        <p className="mb-3.5 text-base leading-[1.7] text-[#6a6477]">
          Choose a constraint for each row and column, then click a square to
          view matching Pokémon. You can load today’s puzzle or create your own
          combinations to explore different possibilities.
        </p>

        <h2 className="mb-3 text-center text-[clamp(1.6rem,4vw,2rem)] font-bold leading-tight text-[#222]">Why use this Pokedoku helper?</h2>

        <p className="mb-3.5 text-base leading-[1.7] text-[#6a6477]">
          Some squares have lots of possible answers, while others are much more
          restrictive than they look. This helper shows valid Pokémon for each
          combination so you can learn new options, avoid invalid guesses, and
          make better choices in the daily puzzle.
        </p>

        <h2 className="mb-3 text-center text-[clamp(1.6rem,4vw,2rem)] font-bold leading-tight text-[#222]">Use it with today’s Pokedoku</h2>

        <p className="mb-3.5 text-base leading-[1.7] text-[#6a6477]">
          Tap <strong>Today&apos;s puzzle</strong> to load the current grid,
          then inspect each square to see which Pokémon fit. You can use it as a
          hint tool, a learning aid, or a quick way to understand difficult
          categories.
        </p>
      </ContentSection>

      <ContentSection className="faq">
        <h2 className="mb-3 text-center text-[clamp(1.6rem,4vw,2rem)] font-bold leading-tight text-[#222]">FAQ</h2>

        <h3 className="mb-2 mt-6 text-[1.1rem] font-bold leading-[1.35] text-[#222]">What is Pokedoku?</h3>

        <p className="mb-3.5 text-base leading-[1.7] text-[#6a6477]">
          Pokedoku is a daily puzzle where each square must be filled with a
          Pokémon that matches both the row and column categories.
        </p>

        <h3 className="mb-2 mt-6 text-[1.1rem] font-bold leading-[1.35] text-[#222]">What does this helper do?</h3>

        <p className="mb-3.5 text-base leading-[1.7] text-[#6a6477]">
          It shows Pokémon that match the selected row and column constraints
          for a square, making it easier to explore valid options.
        </p>

        <h3 className="mb-2 mt-6 text-[1.1rem] font-bold leading-[1.35] text-[#222]">What is Dex Difficulty?</h3>

        <p className="mb-3.5 text-base leading-[1.7] text-[#6a6477]">
          Dex Difficulty shows how hard it is to use a Pokémon in Pokedoku.
          <strong> Nightmare</strong> = few valid spots, lots of competition.
          <strong> Easy</strong> = more options or less competition. Helps you
          see which answers are.
        </p>

        <h3 className="mb-2 mt-6 text-[1.1rem] font-bold leading-[1.35] text-[#222]">Can I use it for the daily puzzle?</h3>

        <p className="mb-3.5 text-base leading-[1.7] text-[#6a6477]">
          Yes. You can load the current puzzle and view possible matches for
          each square.
        </p>

        <h3 className="mb-2 mt-6 text-[1.1rem] font-bold leading-[1.35] text-[#222]">What kinds of constraints can I explore?</h3>

        <p className="mb-3.5 text-base leading-[1.7] text-[#6a6477]">
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
