import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ArchivePuzzle, PuzzleArchiveIndexFile } from "./puzzleArchive";
import { getPuzzleArchiveSlug, isArchivePuzzle, sortArchiveItems } from "./puzzleArchive";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const runtimeDir = path.join(repoRoot, "public", "data", "runtime");
const puzzlesDir = path.join(runtimeDir, "puzzles");
const archiveIndexPath = path.join(runtimeDir, "puzzle-archive-index.json");

async function readJsonFile(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8")) as unknown;
}

async function readArchiveItemsFromPuzzleFiles(): Promise<ArchivePuzzle[]> {
  const entries = await readdir(puzzlesDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(puzzlesDir, entry.name));

  const puzzles = await Promise.all(files.map((filePath) => readJsonFile(filePath)));

  return sortArchiveItems(
    puzzles
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;

        const puzzle = entry as Omit<ArchivePuzzle, "slug">;
        return {
          ...puzzle,
          slug: getPuzzleArchiveSlug(puzzle),
        } satisfies ArchivePuzzle;
      })
      .filter((entry): entry is ArchivePuzzle => entry !== null && isArchivePuzzle(entry)),
  );
}

export async function readPuzzleArchiveIndexFromDisk(): Promise<PuzzleArchiveIndexFile> {
  try {
    const raw = await readJsonFile(archiveIndexPath);
    if (raw && typeof raw === "object" && Array.isArray((raw as PuzzleArchiveIndexFile).items)) {
      const validItems = (raw as PuzzleArchiveIndexFile).items.filter(isArchivePuzzle);
      return {
        generatedAt: typeof (raw as PuzzleArchiveIndexFile).generatedAt === "string" ? (raw as PuzzleArchiveIndexFile).generatedAt : new Date().toISOString(),
        dateRange: {
          from: typeof (raw as PuzzleArchiveIndexFile).dateRange?.from === "string" ? (raw as PuzzleArchiveIndexFile).dateRange.from : "",
          to: typeof (raw as PuzzleArchiveIndexFile).dateRange?.to === "string" ? (raw as PuzzleArchiveIndexFile).dateRange.to : "",
        },
        items: sortArchiveItems(validItems),
      };
    }
  } catch {}

  const items = await readArchiveItemsFromPuzzleFiles().catch(() => []);
  return {
    generatedAt: new Date().toISOString(),
    dateRange: {
      from: items.at(-1)?.date ?? "",
      to: items[0]?.date ?? "",
    },
    items,
  };
}
