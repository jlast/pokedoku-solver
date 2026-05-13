import { error as logError } from './logger';

const RUNTIME_STATS_TTL_MS = 4 * 60 * 60 * 1000;

type CategoryRuntimeStats = {
  daysAgo: number;
  date: string;
};

type CachedStats = {
  stats: CategoryRuntimeStats | null;
  cachedAt: number;
};

const cachedStatsByKey = new Map<string, CachedStats>();
const inFlightByKey = new Map<string, Promise<CategoryRuntimeStats | null>>();

const slug = (value: string): string =>
  value.toLowerCase().replaceAll(' ', '-').replaceAll('.', '');

const isCacheFresh = (cachedAt: number): boolean => {
  return Date.now() - cachedAt < RUNTIME_STATS_TTL_MS;
};

const canonicalizeDualTypeNames = (
  leftTypeName: string,
  rightTypeName: string
): [string, string] => {
  const categoryIds = [`types:${leftTypeName}`, `types:${rightTypeName}`].sort();
  const leftCanonicalTypeName = categoryIds[0]?.slice('types:'.length) ?? leftTypeName;
  const rightCanonicalTypeName = categoryIds[1]?.slice('types:'.length) ?? rightTypeName;
  return [leftCanonicalTypeName, rightCanonicalTypeName];
};

const getCategoryRuntimeStatsUrl = (categoryName: string): string => {
  return `https://www.pokedoku-helper.com/data/runtime/categories/${slug(categoryName)}-stats.json`;
};

const getDualTypeRuntimeStatsUrl = (leftTypeName: string, rightTypeName: string): string => {
  const [leftCanonicalTypeName, rightCanonicalTypeName] = canonicalizeDualTypeNames(
    leftTypeName,
    rightTypeName
  );
  return `https://www.pokedoku-helper.com/data/runtime/category-pairs/${slug(leftCanonicalTypeName)}-x-${slug(rightCanonicalTypeName)}-stats.json`;
};

const fetchCategoryRuntimeStats = async (url: string): Promise<CategoryRuntimeStats | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch runtime stats: ${response.status}`);
    }

    const json = (await response.json()) as {
      lastAppeared?: { daysAgo?: unknown; date?: unknown };
    };

    const daysAgo = json.lastAppeared?.daysAgo;
    const date = json.lastAppeared?.date;

    if (typeof daysAgo !== 'number' || typeof date !== 'string') {
      return null;
    }

    return { daysAgo, date };
  } catch (error) {
    logError(`category runtime stats fetch failed url=${url}`, error);
    return null;
  }
};

const getCategoryRuntimeStatsByKey = async (
  cacheKey: string,
  url: string
): Promise<CategoryRuntimeStats | null> => {
  const cached = cachedStatsByKey.get(cacheKey);
  if (cached && isCacheFresh(cached.cachedAt)) {
    return cached.stats;
  }

  const inFlight = inFlightByKey.get(cacheKey);
  if (inFlight) {
    return await inFlight;
  }

  const request = fetchCategoryRuntimeStats(url)
    .then((stats) => {
      cachedStatsByKey.set(cacheKey, { stats, cachedAt: Date.now() });
      return stats;
    })
    .finally(() => {
      inFlightByKey.delete(cacheKey);
    });

  inFlightByKey.set(cacheKey, request);
  return await request;
};

export const getCategoryRuntimeStats = async (
  categoryName: string
): Promise<CategoryRuntimeStats | null> => {
  const cacheKey = `category:${slug(categoryName)}`;
  const url = getCategoryRuntimeStatsUrl(categoryName);
  return await getCategoryRuntimeStatsByKey(cacheKey, url);
};

export const getDualTypeRuntimeStats = async (
  leftTypeName: string,
  rightTypeName: string
): Promise<CategoryRuntimeStats | null> => {
  const [leftCanonicalTypeName, rightCanonicalTypeName] = canonicalizeDualTypeNames(
    leftTypeName,
    rightTypeName
  );
  const cacheKey = `dualtype:${slug(leftCanonicalTypeName)}-x-${slug(rightCanonicalTypeName)}`;
  const url = getDualTypeRuntimeStatsUrl(leftTypeName, rightTypeName);
  return await getCategoryRuntimeStatsByKey(cacheKey, url);
};
