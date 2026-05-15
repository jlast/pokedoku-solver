import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import type { Pokemon } from "@pokedoku-helper/shared-types";
import { enrichPuzzlesWithFeaturedPick, fetchPuzzles, type MappedPuzzle } from "../lib/puzzle-fetch-core";

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

async function writeLocalPuzzleFiles(puzzles: MappedPuzzle[]) {
  await mkdir(puzzlesDir, { recursive: true });

  const todayPuzzlePath = path.join(runtimeDir, "today-puzzle.json");
  await writeFile(todayPuzzlePath, JSON.stringify(puzzles, null, 2), "utf8");

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
