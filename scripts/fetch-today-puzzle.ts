import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import type { Pokemon } from "@pokedoku-helper/shared-types";
import { createTodayPuzzleFile, enrichPuzzlesWithFeaturedPick, fetchPuzzles, type MappedPuzzle } from "../lib/puzzle-fetch-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runtimeDir = path.join(__dirname, "..", "public", "data", "runtime");
const puzzlesDir = path.join(runtimeDir, "puzzles");
const pokemonPath = path.join(__dirname, "..", "public", "data", "pokemon.json");

async function readPokemonList(): Promise<Pokemon[]> {
  const raw = await readFile(pokemonPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) throw new Error("pokemon.json does not contain a JSON array");
  return parsed as Pokemon[];
}

function getPreviousDate(date: string): string {
  const previousDate = new Date(`${date}T00:00:00Z`);
  previousDate.setUTCDate(previousDate.getUTCDate() - 1);
  return previousDate.toISOString().slice(0, 10);
}

function isRegularPuzzle(puzzle: MappedPuzzle): boolean {
  return puzzle.type !== "BONUS" && puzzle.bonus !== true;
}

async function readYesterdayPuzzle(regularPuzzle: MappedPuzzle): Promise<MappedPuzzle | null> {
  const yesterdayPuzzlePath = path.join(puzzlesDir, `${getPreviousDate(regularPuzzle.date)}.json`);

  try {
    const raw = await readFile(yesterdayPuzzlePath, "utf8");
    const parsed = JSON.parse(raw) as MappedPuzzle;
    return isRegularPuzzle(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function writeLocalPuzzleFiles(puzzles: MappedPuzzle[]) {
  await mkdir(puzzlesDir, { recursive: true });
  const regularPuzzle = puzzles.find(isRegularPuzzle);
  const yesterdayPuzzle = regularPuzzle ? await readYesterdayPuzzle(regularPuzzle) : null;
  const todayPuzzleFile = createTodayPuzzleFile(puzzles, yesterdayPuzzle);

  const todayPuzzlePath = path.join(runtimeDir, "today-puzzle.json");
  await writeFile(todayPuzzlePath, JSON.stringify(todayPuzzleFile, null, 2), "utf8");

  await Promise.all(
    puzzles.map((puzzle) => {
      const suffix = puzzle.type === "BONUS" ? "-bonus" : "";
      const puzzlePath = path.join(puzzlesDir, `${puzzle.date}${suffix}.json`);
      return writeFile(puzzlePath, JSON.stringify(puzzle, null, 2), "utf8");
    }),
  );

  console.log(`Saved ${puzzles.length} puzzle(s) to ${runtimeDir}`);
}

async function main() {
  const puzzles = await fetchPuzzles();
  const pokemon = await readPokemonList();
  const enrichedPuzzles = enrichPuzzlesWithFeaturedPick(puzzles, pokemon);
  await writeLocalPuzzleFiles(enrichedPuzzles);
}

main().catch((error) => {
  console.error("Failed to fetch today puzzle:", error);
  process.exit(1);
});
