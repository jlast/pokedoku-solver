import fs from "node:fs";
import path from "node:path";
import { FILTER_CATEGORIES } from "../../../lib/shared/filters";
import { makePairSlug, slugify } from "./slug";
import { SITE_URL } from "./site";
import type { Pokemon } from "../../../lib/shared/types";

export interface CategoryPageData {
  key: string;
  type: string;
  label: string;
  count: number;
  pokemon: Pokemon[];
  slug: string;
}

export interface CategoryPairPageData {
  left: CategoryPageData;
  right: CategoryPageData;
  slug: string;
  count: number;
  pokemon: Pokemon[];
}

export interface CategoryRuntimeCombinationMatch {
  categories: [string, string];
  occurrences: number;
}

export interface CategoryRuntimeStats {
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
  combinationMatches: CategoryRuntimeCombinationMatch[];
}

const ROOT_DIR = path.resolve(process.cwd(), "..");
const POKEMON_PATH = path.join(ROOT_DIR, "public", "data", "pokemon.json");

let pokemonCache: Pokemon[] | null = null;
let categoriesCache: CategoryPageData[] | null = null;
let categoryBySlugCache: Map<string, CategoryPageData> | null = null;
let pairsCache: CategoryPairPageData[] | null = null;
let pairBySlugCache: Map<string, CategoryPairPageData> | null = null;
let categoryStatsFileNameByIdCache: Map<string, string> | null = null;

export function getPokemonList(): Pokemon[] {
  if (pokemonCache) return pokemonCache;
  const raw = fs.readFileSync(POKEMON_PATH, "utf8");
  pokemonCache = JSON.parse(raw) as Pokemon[];
  return pokemonCache;
}

export function getPokemonSlug(pokemon: Pokemon): string {
  return `${slugify(pokemon.name)}-${pokemon.formId ?? pokemon.id}`;
}

export function getPokemonBySlugMap(): Map<string, Pokemon> {
  const map = new Map<string, Pokemon>();
  for (const pokemon of getPokemonList()) {
    map.set(getPokemonSlug(pokemon), pokemon);
  }
  return map;
}

function buildCategories(): CategoryPageData[] {
  const pokemon = getPokemonList();
  const categories: CategoryPageData[] = [];
  const seenSlugs = new Map<string, string>();

  for (const category of FILTER_CATEGORIES) {
    for (const option of category.options) {
      const filtered = pokemon.filter((entry) => option.filter(entry as never));
      if (filtered.length === 0) continue;
      const key = `${category.key}:${option.name}`;
      const slug = slugify(option.name);
      const existing = seenSlugs.get(slug);
      if (existing && existing !== key) {
        throw new Error(`Duplicate category slug '${slug}' for '${existing}' and '${key}'`);
      }
      seenSlugs.set(slug, key);
      categories.push({
        key,
        type: category.key,
        label: option.name,
        count: filtered.length,
        pokemon: filtered,
        slug,
      });
    }
  }

  return categories;
}

export function getCategories(): CategoryPageData[] {
  if (!categoriesCache) {
    categoriesCache = buildCategories();
  }
  return categoriesCache;
}

export function getCategoryBySlugMap(): Map<string, CategoryPageData> {
  if (!categoryBySlugCache) {
    categoryBySlugCache = new Map(getCategories().map((category) => [category.slug, category]));
  }
  return categoryBySlugCache;
}

function canonicalPairOrder(a: CategoryPageData, b: CategoryPageData): [CategoryPageData, CategoryPageData] {
  return a.slug.localeCompare(b.slug) <= 0 ? [a, b] : [b, a];
}

function buildCategoryPairs(): CategoryPairPageData[] {
  const categories = getCategories();
  const pairs: CategoryPairPageData[] = [];

  for (let i = 0; i < categories.length; i++) {
    for (let j = i + 1; j < categories.length; j++) {
      const [left, right] = canonicalPairOrder(categories[i], categories[j]);
      const rightIds = new Set(right.pokemon.map((pokemon) => pokemon.formId ?? pokemon.id));
      const overlap = left.pokemon.filter((pokemon) => rightIds.has(pokemon.formId ?? pokemon.id));
      if (overlap.length === 0) continue;

      pairs.push({
        left,
        right,
        slug: makePairSlug(left.slug, right.slug),
        count: overlap.length,
        pokemon: overlap,
      });
    }
  }

  pairs.sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
  return pairs;
}

export function getCategoryPairs(): CategoryPairPageData[] {
  if (!pairsCache) {
    pairsCache = buildCategoryPairs();
  }
  return pairsCache;
}

export function getCategoryPairBySlugMap(): Map<string, CategoryPairPageData> {
  if (!pairBySlugCache) {
    pairBySlugCache = new Map(getCategoryPairs().map((pair) => [pair.slug, pair]));
  }
  return pairBySlugCache;
}

export function canonicalizePairSlugs(leftSlug: string, rightSlug: string): string | null {
  const categoryMap = getCategoryBySlugMap();
  const left = categoryMap.get(leftSlug);
  const right = categoryMap.get(rightSlug);
  if (!left || !right) return null;

  const [canonicalLeft, canonicalRight] = canonicalPairOrder(left, right);
  return makePairSlug(canonicalLeft.slug, canonicalRight.slug);
}

export function getCategoryPairBySlugs(leftSlug: string, rightSlug: string): CategoryPairPageData | null {
  const canonicalSlug = canonicalizePairSlugs(leftSlug, rightSlug);
  if (!canonicalSlug) return null;
  return getCategoryPairBySlugMap().get(canonicalSlug) ?? null;
}

function buildCategoryStatsFileNameByIdMap(): Map<string, string> {
  const categoryIds = getCategories().map((category) => category.key).sort((a, b) => a.localeCompare(b));
  const usedCounts = new Map<string, number>();
  const map = new Map<string, string>();

  for (const categoryId of categoryIds) {
    const categoryValue = categoryId.includes(":") ? categoryId.split(":").slice(1).join(":") : categoryId;
    const base = slugify(categoryValue);
    const seenCount = usedCounts.get(base) ?? 0;
    const nextCount = seenCount + 1;
    usedCounts.set(base, nextCount);
    const fileName = nextCount === 1 ? `${base}-stats.json` : `${base}-${nextCount}-stats.json`;
    map.set(categoryId, fileName);
  }

  return map;
}

function getCategoryStatsFileNameByIdMap(): Map<string, string> {
  if (!categoryStatsFileNameByIdCache) {
    categoryStatsFileNameByIdCache = buildCategoryStatsFileNameByIdMap();
  }

  return categoryStatsFileNameByIdCache;
}

export function getCategoryStatsFileNameByCategoryId(categoryId: string): string | null {
  const fileName = getCategoryStatsFileNameByIdMap().get(categoryId);
  return fileName ?? null;
}

export async function fetchCategoryRuntimeStatsByCategoryId(categoryId: string): Promise<CategoryRuntimeStats | null> {
  const fileName = getCategoryStatsFileNameByCategoryId(categoryId);
  if (!fileName) return null;

  const statsPath = `/data/runtime/categories/${fileName}`;
  const statsUrl = typeof window === "undefined" ? new URL(statsPath, SITE_URL).toString() : statsPath;

  try {
    const response = await fetch(`${statsUrl}?t=${Date.now()}`);
    if (!response.ok) return null;

    const parsed = (await response.json()) as CategoryRuntimeStats;
    if (!parsed || typeof parsed.categoryId !== "string") return null;

    const appearanceDates = Array.isArray(parsed.appearanceDates)
      ? [...parsed.appearanceDates].sort((a, b) => b.localeCompare(a)).slice(0, 5)
      : [];

    return {
      ...parsed,
      appearanceDates,
    };
  } catch {
    return null;
  }
}
