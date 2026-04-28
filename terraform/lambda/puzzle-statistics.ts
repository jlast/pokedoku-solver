import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { FILTER_CATEGORIES } from "../../src/utils/filters";
import type { Pokemon } from "../../src/utils/types";

type ConstraintCategory = "regions" | "types" | "evolution" | "category";

interface ConstraintMapping {
  category: ConstraintCategory;
  value: string;
}

interface Puzzle {
  date: string;
  type: string;
  rowConstraints: ConstraintMapping[];
  colConstraints: ConstraintMapping[];
}

interface CategoryCount {
  categoryId: string;
  count: number;
}

interface CategoryPair {
  categories: [string, string];
  count: number;
}

interface CategoryStats {
  puzzlesAnalyzed: number;
  dateRange: {
    from: string;
    to: string;
  };
  categoryCounts: CategoryCount[];
  categoryPairs: CategoryPair[];
  pokemonLastUsable: PokemonLastUsable[];
}

interface PokemonLastUsable {
  formId: number;
  lastUsableDate: string | null;
  daysSinceLastUsable: number | null;
}

const BUCKET_NAME = process.env.BUCKET_NAME!;
const OUTPUT_KEY = process.env.OBJECT_KEY || "data/runtime/puzzle-stats.json";
const PUZZLES_PREFIX = "data/runtime/puzzles/";
const POKEMON_DATA_KEY = "data/pokemon.json";

const s3 = new S3Client({});
const constraintFilters = new Map<string, (pokemon: Pokemon) => boolean>();

for (const filterCategory of FILTER_CATEGORIES) {
  for (const option of filterCategory.options) {
    constraintFilters.set(`${filterCategory.key}:${option.name}`, option.filter);
  }
}

function toCategoryId(constraint: ConstraintMapping): string {
  return `${constraint.category}:${constraint.value}`;
}

async function streamToString(stream: unknown): Promise<string> {
  if (!stream || typeof stream !== "object" || !("transformToString" in stream)) {
    throw new Error("Unable to read S3 object body");
  }

  return (stream as { transformToString: () => Promise<string> }).transformToString();
}

async function listPuzzleKeys(): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: PUZZLES_PREFIX,
        ContinuationToken: continuationToken,
      }),
    );

    for (const object of response.Contents ?? []) {
      if (
        object.Key &&
        object.Key.startsWith(PUZZLES_PREFIX) &&
        object.Key.endsWith(".json")
      ) {
        keys.push(object.Key);
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return keys;
}

async function readPuzzle(key: string): Promise<Puzzle> {
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }),
  );

  const body = await streamToString(response.Body);
  const puzzle = JSON.parse(body) as Puzzle;

  if (!puzzle.date) {
    throw new Error(`Puzzle ${key} is missing date`);
  }

  if (!Array.isArray(puzzle.rowConstraints) || !Array.isArray(puzzle.colConstraints)) {
    throw new Error(`Puzzle ${key} is missing rowConstraints or colConstraints`);
  }

  return puzzle;
}

async function readPokemonList(): Promise<Pokemon[]> {
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: POKEMON_DATA_KEY,
    }),
  );

  const body = await streamToString(response.Body);
  const pokemon = JSON.parse(body) as Pokemon[];

  if (!Array.isArray(pokemon)) {
    throw new Error(`${POKEMON_DATA_KEY} does not contain a JSON array`);
  }

  return pokemon;
}

function increment(map: Map<string, number>, key: string, amount = 1): void {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function startOfDayUtc(dateString: string): Date {
  return new Date(`${dateString}T00:00:00.000Z`);
}

function daysBetween(fromDate: string, toDate: string): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const from = startOfDayUtc(fromDate).getTime();
  const to = startOfDayUtc(toDate).getTime();

  return Math.floor((to - from) / millisecondsPerDay);
}

function normalizeConstraintValue(constraint: ConstraintMapping): string {
  if (constraint.category === "evolution" && constraint.value === "Is Branched") {
    return "Branched evolution";
  }

  if (constraint.category === "category" && constraint.value === "Starter") {
    return "First Partner";
  }

  return constraint.value;
}

function matchesConstraint(pokemon: Pokemon, constraint: ConstraintMapping): boolean {
  const normalizedValue = normalizeConstraintValue(constraint);
  const filter = constraintFilters.get(`${constraint.category}:${normalizedValue}`);

  return filter?.(pokemon) ?? false;
}

function isUsableInPuzzle(pokemon: Pokemon, puzzle: Puzzle): boolean {
  const matchesAnyRow = puzzle.rowConstraints.some((constraint) => matchesConstraint(pokemon, constraint));
  if (!matchesAnyRow) {
    return false;
  }

  return puzzle.colConstraints.some((constraint) => matchesConstraint(pokemon, constraint));
}

function buildPokemonLastUsableStats(puzzles: Puzzle[], pokemon: Pokemon[]): PokemonLastUsable[] {
  const latestPuzzleDate = puzzles.reduce((latest, puzzle) => (puzzle.date > latest ? puzzle.date : latest), "");

  return pokemon
    .filter((entry): entry is Pokemon & { formId: number } => typeof entry.formId === "number")
    .map((entry) => {
      const latestUsableDate = puzzles.reduce<string | null>((latest, puzzle) => {
        if (!isUsableInPuzzle(entry, puzzle)) {
          return latest;
        }

        if (!latest || puzzle.date > latest) {
          return puzzle.date;
        }

        return latest;
      }, null);

      return {
        formId: entry.formId,
        lastUsableDate: latestUsableDate,
        daysSinceLastUsable:
          latestUsableDate && latestPuzzleDate ? daysBetween(latestUsableDate, latestPuzzleDate) : null,
      };
    })
    .sort((a, b) => {
      if (a.lastUsableDate === b.lastUsableDate) {
        return a.formId - b.formId;
      }

      if (a.lastUsableDate === null) {
        return 1;
      }

      if (b.lastUsableDate === null) {
        return -1;
      }

      return b.lastUsableDate.localeCompare(a.lastUsableDate);
    });
}

function buildStats(puzzles: Puzzle[], pokemon: Pokemon[]): CategoryStats {
  const categoryCounts = new Map<string, number>();
  const categoryPairs = new Map<string, number>();

  const dates = puzzles.map((puzzle) => puzzle.date).sort();

  for (const puzzle of puzzles) {
    const rowCategoryIds = puzzle.rowConstraints.map(toCategoryId);
    const colCategoryIds = puzzle.colConstraints.map(toCategoryId);

    // Count categories (rows + columns)
    for (const categoryId of [...rowCategoryIds, ...colCategoryIds]) {
      increment(categoryCounts, categoryId);
    }

    // Count unordered pairs
    for (const rowCategoryId of rowCategoryIds) {
      for (const columnCategoryId of colCategoryIds) {
        const [a, b] = [rowCategoryId, columnCategoryId].sort();
        increment(categoryPairs, `${a}||${b}`);
      }
    }
  }

  return {
    puzzlesAnalyzed: puzzles.length,
    dateRange: {
      from: dates[0] ?? "",
      to: dates[dates.length - 1] ?? "",
    },
    categoryCounts: Array.from(categoryCounts.entries())
      .map(([categoryId, count]) => ({ categoryId, count }))
      .sort((a, b) => b.count - a.count || a.categoryId.localeCompare(b.categoryId)),

    categoryPairs: Array.from(categoryPairs.entries())
      .map(([pairKey, count]) => {
        const categories = pairKey.split("||") as [string, string];

        return {
          categories,
          count,
        };
      })
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;

        const firstCompare = a.categories[0].localeCompare(b.categories[0]);
        if (firstCompare !== 0) return firstCompare;

        return a.categories[1].localeCompare(b.categories[1]);
      }),
    pokemonLastUsable: buildPokemonLastUsableStats(puzzles, pokemon),
  };
}

export async function handler() {
  if (!BUCKET_NAME) {
    throw new Error("BUCKET_NAME is required");
  }

  const keys = await listPuzzleKeys();

  if (keys.length === 0) {
    throw new Error(`No puzzle files found under ${PUZZLES_PREFIX}`);
  }

  const puzzles = await Promise.all(keys.map(readPuzzle));
  const pokemon = await readPokemonList();
  const stats = buildStats(puzzles, pokemon);

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: OUTPUT_KEY,
      Body: JSON.stringify(stats, null, 2),
      ContentType: "application/json",
      CacheControl: "max-age=300, public",
    }),
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Puzzle stats generated",
      bucket: BUCKET_NAME,
      key: OUTPUT_KEY,
      puzzlesAnalyzed: stats.puzzlesAnalyzed,
      dateRange: stats.dateRange,
    }),
  };
}
