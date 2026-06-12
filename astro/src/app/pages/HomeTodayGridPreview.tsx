import { useEffect, useMemo, useState } from "react";
import type { Pokemon } from "@pokedoku-helper/shared-types";
import { parseTodayPuzzleFile } from "../../../../lib/puzzle-fetch-core";
import { matchesConstraint, type Constraint } from "../../../../lib/shared/filters";
import { Grid } from "../components/Grid";

interface TodayPuzzle {
  type: string;
  rowConstraints: Constraint[];
  colConstraints: Constraint[];
}

function createEmptyCells(size: number): (Pokemon | null)[][] {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null));
}

function rankPuzzleType(type: string): number {
  return type === "BONUS" ? 1 : 0;
}

export function HomeTodayGridPreview() {
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [puzzle, setPuzzle] = useState<TodayPuzzle | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/runtime/today-puzzle.json?t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load puzzle");
        return res.json();
      })
      .then((data) => {
        const { puzzles } = parseTodayPuzzleFile(data);
        const puzzleList = puzzles as TodayPuzzle[];
        const [firstPuzzle] = [...puzzleList].sort((a, b) => rankPuzzleType(a.type) - rankPuzzleType(b.type));
        if (firstPuzzle) setPuzzle(firstPuzzle);
      })
      .catch(() => undefined);

    fetch(`${import.meta.env.BASE_URL}data/pokemon.json`)
      .then((res) => res.json())
      .then((data: Pokemon[]) => setPokemon(data))
      .catch(() => undefined);
  }, []);

  const handleOpenToday = () => {
    window.location.href = `${import.meta.env.BASE_URL}pokedoku-answers-today/`;
  };

  const possiblePokemon = useMemo(
    () => {
      if (!puzzle) return [];
      return puzzle.rowConstraints.map((rowConstraint) =>
        puzzle.colConstraints.map((colConstraint) =>
          pokemon.filter((entry) => matchesConstraint(entry, rowConstraint) && matchesConstraint(entry, colConstraint)),
        ),
      );
    },
    [pokemon, puzzle],
  );

  if (!puzzle) {
    return <p className="m-0 text-center text-sm text-[var(--text)]">Loading today&apos;s grid...</p>;
  }

  const gridSize = puzzle.rowConstraints.length;
  const cells = createEmptyCells(gridSize);

  return (
    <div className="w-full overflow-x-auto">
      <div className="mx-auto block w-fit min-w-max cursor-pointer" onClick={handleOpenToday}>
        <Grid
          cells={cells}
          rowConstraints={puzzle.rowConstraints}
          colConstraints={puzzle.colConstraints}
          possiblePokemon={possiblePokemon}
          selectedCell={null}
          editable={false}
          onCellClick={handleOpenToday}
          onConstraintChange={() => undefined}
        />
      </div>
    </div>
  );
}
