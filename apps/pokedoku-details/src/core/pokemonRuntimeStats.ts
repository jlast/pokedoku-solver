import { error as logError } from './logger';

const RUNTIME_STATS_TTL_MS = 4 * 60 * 60 * 1000;

type PokemonRuntimeStats = {
  daysAgo: number;
  date: string;
};

type CachedStats = {
  stats: PokemonRuntimeStats | null;
  cachedAt: number;
};

const cachedStatsByFormId = new Map<number, CachedStats>();
const inFlightByFormId = new Map<number, Promise<PokemonRuntimeStats | null>>();

const isCacheFresh = (cachedAt: number): boolean => {
  return Date.now() - cachedAt < RUNTIME_STATS_TTL_MS;
};

const getRuntimeStatsUrl = (formId: number): string => {
  return `https://www.pokedoku-helper.com/data/runtime/pokemon/${formId}-stats.json`;
};

const fetchPokemonRuntimeStats = async (
  formId: number
): Promise<PokemonRuntimeStats | null> => {
  const url = getRuntimeStatsUrl(formId);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch runtime stats: ${response.status}`);
    }

    const json = (await response.json()) as {
      lastUsable?: { daysAgo?: unknown; date?: unknown };
    };

    const daysAgo = json.lastUsable?.daysAgo;
    const date = json.lastUsable?.date;

    if (typeof daysAgo !== 'number' || typeof date !== 'string') {
      return null;
    }

    return { daysAgo, date };
  } catch (error) {
    logError(`pokemon runtime stats fetch failed formId=${formId}`, error);
    return null;
  }
};

export const getPokemonRuntimeStats = async (
  formId: number
): Promise<PokemonRuntimeStats | null> => {
  const cached = cachedStatsByFormId.get(formId);
  if (cached && isCacheFresh(cached.cachedAt)) {
    return cached.stats;
  }

  const inFlight = inFlightByFormId.get(formId);
  if (inFlight) {
    return await inFlight;
  }

  const request = fetchPokemonRuntimeStats(formId)
    .then((stats) => {
      cachedStatsByFormId.set(formId, { stats, cachedAt: Date.now() });
      return stats;
    })
    .finally(() => {
      inFlightByFormId.delete(formId);
    });

  inFlightByFormId.set(formId, request);
  return await request;
};
