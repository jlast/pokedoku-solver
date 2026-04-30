import { FILTER_CATEGORIES } from "../../../lib/shared/filters";
import { PAIR_FREQUENCY_BUCKETS } from "../../../lib/shared/pairFrequencyBuckets";
import type { Pokemon } from "../../../lib/shared/types";
import { buildCategoryOutputFileNames, parseCategoryId } from "./category-filenames";
import type {
  CategoryCount,
  CategoryPair,
  CategoryStats,
  CategoryStatsFile,
  CategoryStatsSection,
  CategoryTypeSummary,
  ConstraintCategory,
  ConstraintMapping,
  PairFrequencySummary,
  PokemonLastUsable,
  PokemonStatsFile,
  PrecomputedPuzzle,
  Puzzle,
} from "./types";

const constraintFilters = new Map<string, (pokemon: Pokemon) => boolean>();
for (const filterCategory of FILTER_CATEGORIES) {
  for (const option of filterCategory.options) {
    constraintFilters.set(`${filterCategory.key}:${option.name}`, option.filter);
  }
}

export function toCategoryId(constraint: ConstraintMapping): string {
  return `${toCanonicalConstraintCategory(constraint.category)}:${constraint.value}`;
}

function toCanonicalConstraintCategory(category: string): ConstraintCategory {
  if (category === "type" || category === "types") return "types";
  if (category === "region" || category === "regions") return "regions";
  if (category === "evolution") return "evolution";
  if (category === "move") return "move";
  if (category === "ability") return "ability";
  return "category";
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

function matchesConstraint(pokemon: Pokemon, constraint: ConstraintMapping): boolean {
  const normalizedCategory = toCanonicalConstraintCategory(constraint.category);
  const filter = constraintFilters.get(`${normalizedCategory}:${constraint.value}`);
  return filter?.(pokemon) ?? false;
}

function isUsableInPuzzle(pokemon: Pokemon, puzzle: Puzzle): boolean {
  const matchesAnyRow = puzzle.rowConstraints.some((constraint) => matchesConstraint(pokemon, constraint));
  if (!matchesAnyRow) return false;
  return puzzle.colConstraints.some((constraint) => matchesConstraint(pokemon, constraint));
}

export function summarizeFormIdQuality(pokemon: Pokemon[]): {
  total: number;
  missingFormIdCount: number;
  missingFormIdSampleIds: number[];
} {
  const missingFormIdSampleIds: number[] = [];
  let missingFormIdCount = 0;

  for (const entry of pokemon) {
    if (typeof entry.formId === "number" && Number.isFinite(entry.formId)) continue;
    missingFormIdCount += 1;
    if (missingFormIdSampleIds.length < 10) {
      missingFormIdSampleIds.push(entry.id);
    }
  }

  return {
    total: pokemon.length,
    missingFormIdCount,
    missingFormIdSampleIds,
  };
}

function buildPokemonLastUsableStats(puzzles: Puzzle[], pokemon: Pokemon[]): PokemonLastUsable[] {
  const latestPuzzleDate = puzzles.reduce((latest, puzzle) => (puzzle.date > latest ? puzzle.date : latest), "");

  return pokemon
    .map((entry) => {
      const pokemonKeyId = toPokemonKeyId(entry);
      if (pokemonKeyId === null) return null;
      const latestUsableDate = puzzles.reduce<string | null>((latest, puzzle) => {
        if (!isUsableInPuzzle(entry, puzzle)) return latest;
        if (!latest || puzzle.date > latest) return puzzle.date;
        return latest;
      }, null);

      return {
        formId: pokemonKeyId,
        lastUsableDate: latestUsableDate,
        daysSinceLastUsable:
          latestUsableDate && latestPuzzleDate ? daysBetween(latestUsableDate, latestPuzzleDate) : null,
      };
    })
    .filter((entry): entry is PokemonLastUsable => entry !== null)
    .sort((a, b) => {
      if (a.lastUsableDate === b.lastUsableDate) return a.formId - b.formId;
      if (a.lastUsableDate === null) return 1;
      if (b.lastUsableDate === null) return -1;
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
    const combos = categoryPairs.filter(
      (pair) => pair.count >= bucket.min && (bucket.max === null || pair.count <= bucket.max),
    );

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
  const categoryPairs = includeLegacy
    ? allCategoryPairs
    : allCategoryPairs.filter((item) => !isLegacyPair(item));

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

export function buildStats(puzzles: Puzzle[], pokemon: Pokemon[]): CategoryStats {
  const categoryCounts = new Map<string, number>();
  const categoryPairs = new Map<string, number>();
  const dates = puzzles.map((puzzle) => puzzle.date).sort();

  for (const puzzle of puzzles) {
    const rowCategoryIds = puzzle.rowConstraints.map(toCategoryId);
    const colCategoryIds = puzzle.colConstraints.map(toCategoryId);

    for (const categoryId of [...rowCategoryIds, ...colCategoryIds]) increment(categoryCounts, categoryId);

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
    .map(([pairKey, count]) => ({ categories: pairKey.split("||") as [string, string], count }))
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
    dateRange: { from: dates[0] ?? "", to: dates[dates.length - 1] ?? "" },
    withoutLegacy: buildStatsSection(allCategoryCounts, allCategoryPairs, oldestPokemonLastUsable, false),
    withLegacy: buildStatsSection(allCategoryCounts, allCategoryPairs, oldestPokemonLastUsable, true),
  };
}

function toPokemonKeyId(entry: Pokemon): number | null {
  if (typeof entry.formId === "number" && Number.isFinite(entry.formId)) return entry.formId;
  if (typeof entry.id === "number" && Number.isFinite(entry.id)) return entry.id;
  return null;
}

function getDateRange(puzzles: Puzzle[]): { from: string; to: string } {
  const dates = puzzles.map((puzzle) => puzzle.date).sort();
  return { from: dates[0] ?? "", to: dates[dates.length - 1] ?? "" };
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function precomputePuzzles(puzzles: Puzzle[]): PrecomputedPuzzle[] {
  return puzzles.map((puzzle) => ({
    date: puzzle.date,
    rowCategoryIds: puzzle.rowConstraints.map(toCategoryId),
    colCategoryIds: puzzle.colConstraints.map(toCategoryId),
  }));
}

function buildAllCategoryIds(precomputedPuzzles: PrecomputedPuzzle[]): string[] {
  const set = new Set<string>();
  for (const puzzle of precomputedPuzzles) {
    for (const categoryId of puzzle.rowCategoryIds) set.add(categoryId);
    for (const categoryId of puzzle.colCategoryIds) set.add(categoryId);
  }
  return Array.from(set);
}

function buildAllFilterCategoryIds(): string[] {
  const set = new Set<string>();

  for (const filterCategory of FILTER_CATEGORIES) {
    for (const option of filterCategory.options) {
      set.add(`${filterCategory.key}:${option.name}`);
    }
  }

  return Array.from(set);
}

export function buildCategoryStatsFiles(
  puzzles: Puzzle[],
): { files: CategoryStatsFile[]; fileNameByCategoryId: Map<string, string> } {
  const dateRange = getDateRange(puzzles);
  const generatedAt = new Date().toISOString();
  const latestPuzzleDate = dateRange.to;
  const precomputedPuzzles = precomputePuzzles(puzzles);
  const allCategoryIds = Array.from(
    new Set<string>([...buildAllFilterCategoryIds(), ...buildAllCategoryIds(precomputedPuzzles)]),
  );
  const fileNameByCategoryId = buildCategoryOutputFileNames(allCategoryIds);
  const files: CategoryStatsFile[] = [];

  for (const categoryId of allCategoryIds) {
    const { value: categoryValue } = parseCategoryId(categoryId);
    const appearanceDates: string[] = [];
    const combinationMatchesMap = new Map<string, number>();

    for (const puzzle of precomputedPuzzles) {
      const rowHasCategory = puzzle.rowCategoryIds.includes(categoryId);
      const colHasCategory = puzzle.colCategoryIds.includes(categoryId);
      if (!rowHasCategory && !colHasCategory) continue;

      appearanceDates.push(puzzle.date);

      if (rowHasCategory) {
        for (const colCategoryId of puzzle.colCategoryIds) {
          const categories = [categoryId, colCategoryId].sort() as [string, string];
          increment(combinationMatchesMap, `${categories[0]}||${categories[1]}`);
        }
      }

      if (colHasCategory) {
        for (const rowCategoryId of puzzle.rowCategoryIds) {
          const categories = [categoryId, rowCategoryId].sort() as [string, string];
          increment(combinationMatchesMap, `${categories[0]}||${categories[1]}`);
        }
      }
    }

    appearanceDates.sort();
    const lastAppearedDate = appearanceDates.length > 0 ? appearanceDates[appearanceDates.length - 1] : null;
    const combinationMatches = Array.from(combinationMatchesMap.entries())
      .map(([pairKey, occurrences]) => ({ categories: pairKey.split("||") as [string, string], occurrences }))
      .sort((a, b) => {
        if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
        const firstCompare = a.categories[0].localeCompare(b.categories[0]);
        if (firstCompare !== 0) return firstCompare;
        return a.categories[1].localeCompare(b.categories[1]);
      })
      .slice(0, 5);

    files.push({
      categoryId,
      categoryValue,
      puzzlesAnalyzed: puzzles.length,
      dateRange,
      generatedAt,
      totalAppearances: {
        count: appearanceDates.length,
        percentage: puzzles.length === 0 ? 0 : roundTo((appearanceDates.length / puzzles.length) * 100, 2),
      },
      lastAppeared: {
        date: lastAppearedDate,
        daysAgo: lastAppearedDate && latestPuzzleDate ? daysBetween(lastAppearedDate, latestPuzzleDate) : null,
      },
      appearanceDates,
      combinationMatches,
    });
  }

  files.sort((a, b) => a.categoryId.localeCompare(b.categoryId));
  return { files, fileNameByCategoryId };
}

export function buildPokemonStatsFiles(
  puzzles: Puzzle[],
  pokemon: Pokemon[],
): { files: PokemonStatsFile[]; skipped: number } {
  const dateRange = getDateRange(puzzles);
  const generatedAt = new Date().toISOString();
  const latestPuzzleDate = dateRange.to;

  const files: PokemonStatsFile[] = [];
  let skipped = 0;
  const precomputedPuzzles = precomputePuzzles(puzzles);
  const allCategoryIds = buildAllCategoryIds(precomputedPuzzles);

  for (const entry of pokemon) {
    const pokemonKeyId = toPokemonKeyId(entry);
    if (pokemonKeyId === null) {
      skipped += 1;
      continue;
    }

    const usableDates: string[] = [];
    const categoryMatchesMap = new Map<string, number>();
    const combinationMatchesMap = new Map<string, number>();
    const matchesByCategory = new Map<string, boolean>();

    for (const categoryId of allCategoryIds) {
      const separatorIndex = categoryId.indexOf(":");
      const category = toCanonicalConstraintCategory(categoryId.slice(0, separatorIndex));
      const value = categoryId.slice(separatorIndex + 1);
      matchesByCategory.set(categoryId, matchesConstraint(entry, { category, value }));
    }

    for (const puzzle of precomputedPuzzles) {
      const rowCategoryIds = puzzle.rowCategoryIds;
      const colCategoryIds = puzzle.colCategoryIds;
      const rowMatches = rowCategoryIds.map((categoryId) => matchesByCategory.get(categoryId) ?? false);
      const colMatches = colCategoryIds.map((categoryId) => matchesByCategory.get(categoryId) ?? false);
      let matchedRow = false;
      let matchedColumn = false;

      for (let i = 0; i < rowCategoryIds.length; i++) {
        if (rowMatches[i]) {
          matchedRow = true;
          increment(categoryMatchesMap, rowCategoryIds[i]);
        }
      }

      for (let i = 0; i < colCategoryIds.length; i++) {
        if (colMatches[i]) {
          matchedColumn = true;
          increment(categoryMatchesMap, colCategoryIds[i]);
        }
      }

      for (let r = 0; r < rowCategoryIds.length; r++) {
        if (!rowMatches[r]) continue;
        for (let c = 0; c < colCategoryIds.length; c++) {
          if (colMatches[c]) {
            const categories = [rowCategoryIds[r], colCategoryIds[c]].sort() as [string, string];
            increment(combinationMatchesMap, `${categories[0]}||${categories[1]}`);
          }
        }
      }

      if (matchedRow && matchedColumn) usableDates.push(puzzle.date);
    }

    usableDates.sort();
    const lastUsableDate = usableDates.length > 0 ? usableDates[usableDates.length - 1] : null;
    const totalAppearancesCount = usableDates.length;

    const categoryMatches = Array.from(categoryMatchesMap.entries())
      .map(([categoryId, occurrences]) => ({ categoryId, occurrences }))
      .sort((a, b) => b.occurrences - a.occurrences || a.categoryId.localeCompare(b.categoryId))
      .slice(0, 5);

    const combinationMatches = Array.from(combinationMatchesMap.entries())
      .map(([pairKey, occurrences]) => ({ categories: pairKey.split("||") as [string, string], occurrences }))
      .sort((a, b) => {
        if (b.occurrences !== a.occurrences) return b.occurrences - a.occurrences;
        const firstCompare = a.categories[0].localeCompare(b.categories[0]);
        if (firstCompare !== 0) return firstCompare;
        return a.categories[1].localeCompare(b.categories[1]);
      })
      .slice(0, 5);

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
        daysAgo: lastUsableDate && latestPuzzleDate ? daysBetween(lastUsableDate, latestPuzzleDate) : null,
      },
      usableDates,
      categoryMatches,
      combinationMatches,
    });
  }

  files.sort((a, b) => a.pokemonKeyId - b.pokemonKeyId);
  return { files, skipped };
}
