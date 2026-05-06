import type { Pokemon } from '@pokedoku-helper/shared-types';

const POKEMON_DATA_URL = 'https://www.pokedoku-helper.com/data/pokemon.json';
const DEFAULT_TTL_MS = 15 * 60 * 1000;

let cachedMap: Map<string, Pokemon> | null = null;
let cachedAt: number | null = null;
let inFlight: Promise<Map<string, Pokemon>> | null = null;

const normalize = (value: string): string => value.trim().toLowerCase();

const isCacheFresh = (): boolean => {
  if (!cachedMap || !cachedAt) {
    return false;
  }

  return Date.now() - cachedAt < DEFAULT_TTL_MS;
};

const buildPokemonMap = (pokemon: Pokemon[]): Map<string, Pokemon> => {
  const map = new Map<string, Pokemon>();

  for (const entry of pokemon) {
    map.set(normalize(entry.name), entry);
  }

  return map;
};

const fetchPokemonMap = async (): Promise<Map<string, Pokemon>> => {
  const response = await fetch(POKEMON_DATA_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Pokemon data: ${response.status}`);
  }

  const pokemon = (await response.json()) as Pokemon[];
  return buildPokemonMap(pokemon);
};

export const getPokemonMap = async (): Promise<Map<string, Pokemon>> => {
  if (isCacheFresh() && cachedMap) {
    return cachedMap;
  }

  if (!inFlight) {
    inFlight = fetchPokemonMap()
      .then((map) => {
        cachedMap = map;
        cachedAt = Date.now();
        return map;
      })
      .finally(() => {
        inFlight = null;
      });
  }

  try {
    return await inFlight;
  } catch (error) {
    if (cachedMap) {
      console.warn('Pokemon fetch failed, serving stale cache', error);
      return cachedMap;
    }

    throw error;
  }
};

export const invalidatePokemonCache = (): void => {
  cachedMap = null;
  cachedAt = null;
  inFlight = null;
};

export const getPokemonCacheStatus = () => ({
  hasCache: Boolean(cachedMap),
  size: cachedMap?.size ?? 0,
  cachedAt,
  ageMs: cachedAt ? Date.now() - cachedAt : null,
  ttlMs: DEFAULT_TTL_MS,
});
