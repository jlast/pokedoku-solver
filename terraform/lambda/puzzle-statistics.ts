import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { FILTER_CATEGORIES } from "../../lib/shared/filters";
import { PAIR_FREQUENCY_BUCKETS } from "../../lib/shared/pairFrequencyBuckets";
import type { Pokemon } from "../../lib/shared/types";

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
  withoutLegacy: CategoryStatsSection;
  withLegacy: CategoryStatsSection;
}

interface CategoryStatsSection {
  topCategoryCounts: CategoryCount[];
  leastCategoryCounts: CategoryCount[];
  categoryTypeBreakdown: CategoryTypeSummary[];
  topCategoryPairs: CategoryPair[];
  leastCategoryPairs: CategoryPair[];
  pairFrequencyDistribution: PairFrequencySummary[];
  oldestPokemonLastUsable: PokemonLastUsable[];
}

interface CategoryTypeSummary {
  type: string;
  count: number;
}

interface PairFrequencySummary {
  key: string;
  label: string;
  min: number;
  max: number | null;
  comboCount: number;
  occurrenceCount: number;
}

interface PokemonLastUsable {
  formId: number;
  lastUsableDate: string | null;
  daysSinceLastUsable: number | null;
}

interface PokemonCategoryMatch {
  categoryId: string;
  occurrences: number;
}

interface PokemonCombinationMatch {
  categories: [string, string];
  occurrences: number;
}

interface PokemonStatsFile {
  pokemonKeyId: number;
  id: number;
  formId: number | null;
  name: string;
  puzzlesAnalyzed: number;
  dateRange: {
    from: string;
    to: string;
  };
  generatedAt: string;
  totalAppearances: {
    count: number;
    percentage: number;
  };
  lastUsable: {
    date: string | null;
    daysAgo: number | null;
  };
  usableDates: string[];
  categoryMatches: PokemonCategoryMatch[];
  combinationMatches: PokemonCombinationMatch[];
}

const BUCKET_NAME = process.env.BUCKET_NAME!;
const OUTPUT_KEY = process.env.OBJECT_KEY || "data/runtime/puzzle-stats.json";
const PUZZLES_PREFIX = "data/runtime/puzzles/";
const POKEMON_DATA_KEY = "data/pokemon.json";
const POKEMON_STATS_PREFIX = "data/runtime/pokemon/";

const s3 = new S3Client({});
const constraintFilters = new Map<string, (pokemon: Pokemon) => boolean>();
const IO_CONCURRENCY = Number(process.env.IO_CONCURRENCY ?? 20);

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

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const safeConcurrency = Math.max(1, Math.min(concurrency, items.length));
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: safeConcurrency }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
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

function buildCategoryTypeBreakdown(categoryCounts: CategoryCount[]): CategoryTypeSummary[] {
  const totals = new Map<string, number>();

  for (const item of categoryCounts) {
    const separatorIndex = item.categoryId.indexOf(":");
    const type = separatorIndex === -1 ? "other" : item.categoryId.slice(0, separatorIndex);
    totals.set(type, (totals.get(type) ?? 0) + item.count);
  }

  return Array.from(totals.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
}

function buildPairFrequencyDistribution(categoryPairs: CategoryPair[]): PairFrequencySummary[] {
  return PAIR_FREQUENCY_BUCKETS.map((bucket) => {
    const combos = categoryPairs.filter((pair) => pair.count >= bucket.min && (bucket.max === null || pair.count <= bucket.max));

    return {
      key: bucket.key,
      label: bucket.label,
      min: bucket.min,
      max: bucket.max,
      comboCount: combos.length,
      occurrenceCount: combos.reduce((sum, pair) => sum + pair.count, 0),
    };
  });
}

function isLegacyCategoryId(categoryId: string): boolean {
  return categoryId.startsWith("move:") || categoryId.startsWith("ability:");
}

function isLegacyPair(pair: CategoryPair): boolean {
  return pair.categories.some((categoryId) => isLegacyCategoryId(categoryId));
}

function buildStatsSection(
  allCategoryCounts: CategoryCount[],
  allCategoryPairs: CategoryPair[],
  oldestPokemonLastUsable: PokemonLastUsable[],
  includeLegacy: boolean,
): CategoryStatsSection {
  const categoryCounts = includeLegacy
    ? allCategoryCounts
    : allCategoryCounts.filter((item) => !isLegacyCategoryId(item.categoryId));
  const categoryPairs = includeLegacy ? allCategoryPairs : allCategoryPairs.filter((item) => !isLegacyPair(item));

  return {
    topCategoryCounts: categoryCounts.slice(0, 5),
    leastCategoryCounts: [...categoryCounts]
      .sort((a, b) => a.count - b.count || a.categoryId.localeCompare(b.categoryId))
      .slice(0, 5),
    categoryTypeBreakdown: buildCategoryTypeBreakdown(categoryCounts),
    topCategoryPairs: categoryPairs.slice(0, 5),
    leastCategoryPairs: [...categoryPairs]
      .sort((a, b) => {
        if (a.count !== b.count) return a.count - b.count;

        const firstCompare = a.categories[0].localeCompare(b.categories[0]);
        if (firstCompare !== 0) return firstCompare;

        return a.categories[1].localeCompare(b.categories[1]);
      })
      .slice(0, 5),
    pairFrequencyDistribution: buildPairFrequencyDistribution(categoryPairs),
    oldestPokemonLastUsable,
  };
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

  const allCategoryCounts = Array.from(categoryCounts.entries())
    .map(([categoryId, count]) => ({ categoryId, count }))
    .sort((a, b) => b.count - a.count || a.categoryId.localeCompare(b.categoryId));

  const allCategoryPairs = Array.from(categoryPairs.entries())
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
    });

  const oldestPokemonLastUsable = buildPokemonLastUsableStats(puzzles, pokemon)
    .filter((item) => item.lastUsableDate !== null)
    .sort((a, b) => {
      if (a.daysSinceLastUsable === null && b.daysSinceLastUsable === null) return 0;
      if (a.daysSinceLastUsable === null) return 1;
      if (b.daysSinceLastUsable === null) return -1;
      return b.daysSinceLastUsable - a.daysSinceLastUsable || a.formId - b.formId;
    })
    .slice(0, 5);

  return {
    puzzlesAnalyzed: puzzles.length,
    dateRange: {
      from: dates[0] ?? "",
      to: dates[dates.length - 1] ?? "",
    },
    withoutLegacy: buildStatsSection(allCategoryCounts, allCategoryPairs, oldestPokemonLastUsable, false),
    withLegacy: buildStatsSection(allCategoryCounts, allCategoryPairs, oldestPokemonLastUsable, true),
  };
}

function toPokemonKeyId(entry: Pokemon): number | null {
  if (typeof entry.formId === "number" && Number.isFinite(entry.formId)) {
    return entry.formId;
  }

  if (typeof entry.id === "number" && Number.isFinite(entry.id)) {
    return entry.id;
  }

  return null;
}

function getDateRange(puzzles: Puzzle[]): { from: string; to: string } {
  const dates = puzzles.map((puzzle) => puzzle.date).sort();
  return {
    from: dates[0] ?? "",
    to: dates[dates.length - 1] ?? "",
  };
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function buildPokemonStatsFiles(
  puzzles: Puzzle[],
  pokemon: Pokemon[],
): { files: PokemonStatsFile[]; skipped: number } {
  const dateRange = getDateRange(puzzles);
  const generatedAt = new Date().toISOString();
  const latestPuzzleDate = dateRange.to;

  const files: PokemonStatsFile[] = [];
  let skipped = 0;

  for (const entry of pokemon) {
    const pokemonKeyId = toPokemonKeyId(entry);

    if (pokemonKeyId === null) {
      skipped += 1;
      console.warn("Skipping Pokemon with invalid identifiers", {
        name: entry.name,
        id: entry.id,
        formId: entry.formId,
      });
      continue;
    }

    const usableDates: string[] = [];
    const categoryMatchesMap = new Map<string, number>();
    const combinationMatchesMap = new Map<string, number>();

    for (const puzzle of puzzles) {
      const rowCategoryIds = puzzle.rowConstraints.map(toCategoryId);
      const colCategoryIds = puzzle.colConstraints.map(toCategoryId);
      const rowMatches = puzzle.rowConstraints.map((constraint) => matchesConstraint(entry, constraint));
      const colMatches = puzzle.colConstraints.map((constraint) => matchesConstraint(entry, constraint));
      let matchedRow = false;
      let matchedColumn = false;

      for (let i = 0; i < puzzle.rowConstraints.length; i++) {
        if (rowMatches[i]) {
          matchedRow = true;
          increment(categoryMatchesMap, rowCategoryIds[i]);
        }
      }

      for (let i = 0; i < puzzle.colConstraints.length; i++) {
        if (colMatches[i]) {
          matchedColumn = true;
          increment(categoryMatchesMap, colCategoryIds[i]);
        }
      }

      for (let r = 0; r < puzzle.rowConstraints.length; r++) {
        if (!rowMatches[r]) {
          continue;
        }

        for (let c = 0; c < puzzle.colConstraints.length; c++) {
          if (colMatches[c]) {
            const categories = [rowCategoryIds[r], colCategoryIds[c]].sort() as [string, string];
            increment(combinationMatchesMap, `${categories[0]}||${categories[1]}`);
          }
        }
      }

      if (matchedRow && matchedColumn) {
        usableDates.push(puzzle.date);
      }
    }

    usableDates.sort();
    const lastUsableDate = usableDates.length > 0 ? usableDates[usableDates.length - 1] : null;
    const totalAppearancesCount = usableDates.length;

    const categoryMatches = Array.from(categoryMatchesMap.entries())
      .map(([categoryId, occurrences]) => ({ categoryId, occurrences }))
      .sort((a, b) => b.occurrences - a.occurrences || a.categoryId.localeCompare(b.categoryId));

    const combinationMatches = Array.from(combinationMatchesMap.entries())
      .map(([pairKey, occurrences]) => ({
        categories: pairKey.split("||") as [string, string],
        occurrences,
      }))
      .sort((a, b) => {
        if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
        const firstCompare = a.categories[0].localeCompare(b.categories[0]);
        if (firstCompare !== 0) return firstCompare;
        return a.categories[1].localeCompare(b.categories[1]);
      });

    files.push({
      pokemonKeyId,
      id: entry.id,
      formId: typeof entry.formId === "number" ? entry.formId : null,
      name: entry.name,
      puzzlesAnalyzed: puzzles.length,
      dateRange,
      generatedAt,
      totalAppearances: {
        count: totalAppearancesCount,
        percentage: puzzles.length === 0 ? 0 : roundTo((totalAppearancesCount / puzzles.length) * 100, 2),
      },
      lastUsable: {
        date: lastUsableDate,
        daysAgo:
          lastUsableDate && latestPuzzleDate
            ? daysBetween(lastUsableDate, latestPuzzleDate)
            : null,
      },
      usableDates,
      categoryMatches,
      combinationMatches,
    });
  }

  files.sort((a, b) => a.pokemonKeyId - b.pokemonKeyId);

  return { files, skipped };
}

export async function handler() {
  if (!BUCKET_NAME) {
    throw new Error("BUCKET_NAME is required");
  }

  const keys = await listPuzzleKeys();

  if (keys.length === 0) {
    throw new Error(`No puzzle files found under ${PUZZLES_PREFIX}`);
  }

  const puzzles = await mapWithConcurrency(keys, IO_CONCURRENCY, readPuzzle);
  const pokemon = await readPokemonList();
  const stats = buildStats(puzzles, pokemon);
  const pokemonStats = buildPokemonStatsFiles(puzzles, pokemon);

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: OUTPUT_KEY,
      Body: JSON.stringify(stats, null, 2),
      ContentType: "application/json",
      CacheControl: "max-age=300, public",
    }),
  );

  await mapWithConcurrency(pokemonStats.files, IO_CONCURRENCY, async (pokemonStatsFile) => {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `${POKEMON_STATS_PREFIX}${pokemonStatsFile.pokemonKeyId}-stats.json`,
        Body: JSON.stringify(pokemonStatsFile, null, 2),
        ContentType: "application/json",
        CacheControl: "max-age=300, public",
      }),
    );
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Puzzle stats generated",
      bucket: BUCKET_NAME,
      key: OUTPUT_KEY,
      puzzlesAnalyzed: stats.puzzlesAnalyzed,
      dateRange: stats.dateRange,
      pokemonStatsPrefix: POKEMON_STATS_PREFIX,
      pokemonStatsWritten: pokemonStats.files.length,
      pokemonStatsSkipped: pokemonStats.skipped,
    }),
  };
}
