import type { Pokemon } from "../../../lib/shared/types";

export type ConstraintCategory = "regions" | "types" | "evolution" | "category";

export interface ConstraintMapping {
  category: ConstraintCategory;
  value: string;
}

export interface Puzzle {
  date: string;
  type: string;
  rowConstraints: ConstraintMapping[];
  colConstraints: ConstraintMapping[];
}

export interface CategoryCount {
  categoryId: string;
  count: number;
}

export interface CategoryPair {
  categories: [string, string];
  count: number;
}

export interface CategoryStats {
  puzzlesAnalyzed: number;
  dateRange: {
    from: string;
    to: string;
  };
  withoutLegacy: CategoryStatsSection;
  withLegacy: CategoryStatsSection;
}

export interface CategoryStatsSection {
  topCategoryCounts: CategoryCount[];
  leastCategoryCounts: CategoryCount[];
  categoryTypeBreakdown: CategoryTypeSummary[];
  topCategoryPairs: CategoryPair[];
  leastCategoryPairs: CategoryPair[];
  pairFrequencyDistribution: PairFrequencySummary[];
  oldestPokemonLastUsable: PokemonLastUsable[];
}

export interface CategoryTypeSummary {
  type: string;
  count: number;
}

export interface PairFrequencySummary {
  key: string;
  label: string;
  min: number;
  max: number | null;
  comboCount: number;
  occurrenceCount: number;
}

export interface PokemonLastUsable {
  formId: number;
  lastUsableDate: string | null;
  daysSinceLastUsable: number | null;
}

export interface PokemonCategoryMatch {
  categoryId: string;
  occurrences: number;
}

export interface PokemonCombinationMatch {
  categories: [string, string];
  occurrences: number;
}

export interface CategoryCombinationMatch {
  categories: [string, string];
  occurrences: number;
}

export interface CategoryStatsFile {
  categoryId: string;
  categoryValue: string;
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
  lastAppeared: {
    date: string | null;
    daysAgo: number | null;
  };
  appearanceDates: string[];
  combinationMatches: CategoryCombinationMatch[];
}

export interface PrecomputedPuzzle {
  date: string;
  rowCategoryIds: string[];
  colCategoryIds: string[];
}

export interface PokemonStatsFile {
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

export interface RuntimeDataBundle {
  stats: CategoryStats;
  pokemonStats: { files: PokemonStatsFile[]; skipped: number };
  categoryStats: { files: CategoryStatsFile[]; fileNameByCategoryId: Map<string, string> };
  pokemon: Pokemon[];
  puzzles: Puzzle[];
}
