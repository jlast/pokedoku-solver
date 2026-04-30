import { mkdir, readdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import type { Pokemon } from "../lib/shared/types";
import { buildCategoryStatsFiles, buildPokemonStatsFiles, buildStats } from "../terraform/lambda/puzzle-statistics/core";
import type { Puzzle } from "../terraform/lambda/puzzle-statistics/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const runtimeDir = path.join(rootDir, "public", "data", "runtime");
const puzzlesDir = path.join(runtimeDir, "puzzles");
const pokemonStatsDir = path.join(runtimeDir, "pokemon");
const categoriesStatsDir = path.join(runtimeDir, "categories");
const summaryPath = path.join(runtimeDir, "puzzle-stats.json");
const pokemonPath = path.join(rootDir, "public", "data", "pokemon.json");

async function readJsonFile<T>(filePath: string): Promise<T> {
  const data = await readFile(filePath, "utf8");
  return JSON.parse(data) as T;
}

async function readPuzzlesFromDisk(): Promise<Puzzle[]> {
  const entries = await readdir(puzzlesDir, { withFileTypes: true });
  const puzzleFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(puzzlesDir, entry.name));

  const puzzles = await Promise.all(puzzleFiles.map((filePath) => readJsonFile<Puzzle>(filePath)));
  return puzzles;
}

async function resetDirectory(directoryPath: string): Promise<void> {
  await rm(directoryPath, { recursive: true, force: true });
  await mkdir(directoryPath, { recursive: true });
}

async function main() {
  const puzzles = await readPuzzlesFromDisk();
  if (puzzles.length === 0) {
    throw new Error(`No puzzle files found under ${puzzlesDir}`);
  }

  const pokemon = await readJsonFile<Pokemon[]>(pokemonPath);
  if (!Array.isArray(pokemon)) {
    throw new Error(`${pokemonPath} does not contain a JSON array`);
  }

  const stats = buildStats(puzzles, pokemon);
  const pokemonStats = buildPokemonStatsFiles(puzzles, pokemon);
  const categoryStats = buildCategoryStatsFiles(puzzles);

  await mkdir(runtimeDir, { recursive: true });
  await writeFile(summaryPath, JSON.stringify(stats, null, 2), "utf8");

  await resetDirectory(pokemonStatsDir);
  await Promise.all(
    pokemonStats.files.map((file) =>
      writeFile(path.join(pokemonStatsDir, `${file.pokemonKeyId}-stats.json`), JSON.stringify(file, null, 2), "utf8"),
    ),
  );

  await resetDirectory(categoriesStatsDir);
  await Promise.all(
    categoryStats.files.map((file) => {
      const fileName = categoryStats.fileNameByCategoryId.get(file.categoryId);
      if (!fileName) {
        throw new Error(`Missing output filename for category ${file.categoryId}`);
      }

      return writeFile(path.join(categoriesStatsDir, fileName), JSON.stringify(file, null, 2), "utf8");
    }),
  );

  console.log("Puzzle statistics generated locally", {
    puzzlesAnalyzed: stats.puzzlesAnalyzed,
    summaryPath,
    pokemonStatsDir,
    pokemonStatsCount: pokemonStats.files.length,
    categoryStatsDir: categoriesStatsDir,
    categoryStatsCount: categoryStats.files.length,
  });
}

main().catch((error) => {
  console.error("Failed to generate puzzle statistics locally:", error);
  process.exit(1);
});
