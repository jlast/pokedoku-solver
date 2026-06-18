import type { Pokemon } from '@pokedoku-helper/shared-types';
import localPokemonData from '../generated/pokemon.local.json';
import { error as logError, log, warn } from './logger';

const POKEMON_DATA_URL = 'https://www.pokedoku-helper.com/data/pokemon.json';
const DEFAULT_TTL_MS = 60 * 60 * 1000;

let cachedMap: Map<string, Pokemon> | null = null;
let cachedAt: number | null = null;
let inFlight: Promise<Map<string, Pokemon>> | null = null;

const normalize = (value: string): string => value.trim().toLowerCase();

const normalizeForFuzzy = (value: string): string =>
  normalize(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeFuzzyWord = (word: string): string => {
  switch (word) {
    case 'gmax':
      return 'gigantamax';
    default:
      return word;
  }
};

const normalizeWordsForFuzzy = (value: string): string[] =>
  normalizeForFuzzy(value)
    .split(' ')
    .filter(Boolean)
    .map(normalizeFuzzyWord);

const levenshteinDistance = (left: string, right: string): number => {
  if (left === right) {
    return 0;
  }

  if (left.length === 0) {
    return right.length;
  }

  if (right.length === 0) {
    return left.length;
  }

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array<number>(right.length + 1);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;

      current[rightIndex] = Math.min(
        previous[rightIndex]! + 1,
        current[rightIndex - 1]! + 1,
        previous[rightIndex - 1]! + substitutionCost
      );
    }

    for (let index = 0; index < previous.length; index += 1) {
      previous[index] = current[index]!;
    }
  }

  return previous[right.length]!;
};

const similarityFromDistance = (left: string, right: string): number => {
  const maxLength = Math.max(left.length, right.length);
  if (maxLength === 0) {
    return 1;
  }

  return 1 - levenshteinDistance(left, right) / maxLength;
};

const getWordOverlapScore = (leftWords: string[], rightWords: string[]): number => {
  if (leftWords.length === 0 || rightWords.length === 0) {
    return 0;
  }

  const rightWordCounts = new Map<string, number>();
  for (const word of rightWords) {
    rightWordCounts.set(word, (rightWordCounts.get(word) ?? 0) + 1);
  }

  let overlap = 0;
  for (const word of leftWords) {
    const count = rightWordCounts.get(word) ?? 0;
    if (count > 0) {
      overlap += 1;
      rightWordCounts.set(word, count - 1);
    }
  }

  return (2 * overlap) / (leftWords.length + rightWords.length);
};

const getContainmentScore = (left: string, right: string): number => {
  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  if (left.startsWith(right) || right.startsWith(left)) {
    return 0.95;
  }

  if (left.includes(right) || right.includes(left)) {
    return 0.75;
  }

  return 0;
};

const scorePokemonName = (token: string, candidate: string): number => {
  const normalizedToken = normalizeForFuzzy(token);
  const normalizedCandidate = normalizeForFuzzy(candidate);
  const fuzzyToken = normalizeWordsForFuzzy(token).join(' ');
  const fuzzyCandidate = normalizeWordsForFuzzy(candidate).join(' ');

  if (!normalizedToken || !normalizedCandidate) {
    return 0;
  }

  if (normalizedToken === normalizedCandidate) {
    return 1;
  }

  const rawSimilarity = similarityFromDistance(normalizedToken, normalizedCandidate);
  const fuzzySimilarity = similarityFromDistance(fuzzyToken, fuzzyCandidate);
  const wordOverlap = getWordOverlapScore(
    normalizeWordsForFuzzy(token),
    normalizeWordsForFuzzy(candidate)
  );
  const containmentScore = Math.max(
    getContainmentScore(normalizedToken, normalizedCandidate),
    getContainmentScore(fuzzyToken, fuzzyCandidate)
  );

  return Math.max(
    rawSimilarity,
    fuzzySimilarity,
    wordOverlap * 0.95,
    containmentScore * 0.95
  );
};

type PokemonMatchResult = {
  pokemon: Pokemon;
  score: number;
};

const FUZZY_SCORE_THRESHOLD = 0.84;
const FUZZY_MARGIN_THRESHOLD = 0.06;
const SHORT_TOKEN_SCORE_THRESHOLD = 0.93;
const SHORT_TOKEN_MARGIN_THRESHOLD = 0.1;

const getFuzzyThresholds = (token: string) => {
  const normalizedToken = normalizeForFuzzy(token);
  const isShortToken = normalizedToken.replace(/\s+/g, '').length < 6;

  return isShortToken
    ? {
        scoreThreshold: SHORT_TOKEN_SCORE_THRESHOLD,
        marginThreshold: SHORT_TOKEN_MARGIN_THRESHOLD,
      }
    : {
        scoreThreshold: FUZZY_SCORE_THRESHOLD,
        marginThreshold: FUZZY_MARGIN_THRESHOLD,
      };
};

const getBestFuzzyPokemonMatch = (
  token: string,
  pokemonList: Pokemon[]
): PokemonMatchResult | null => {
  const scoredMatches = pokemonList
    .map((pokemon) => ({
      pokemon,
      score: scorePokemonName(token, pokemon.name),
    }))
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score);

  const bestMatch = scoredMatches[0];
  if (!bestMatch) {
    return null;
  }

  const secondBestMatch = scoredMatches[1];
  const { scoreThreshold, marginThreshold } = getFuzzyThresholds(token);

  if (bestMatch.score < scoreThreshold) {
    return null;
  }

  if (secondBestMatch && bestMatch.score - secondBestMatch.score < marginThreshold) {
    return null;
  }

  return bestMatch;
};

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
  try {
    const response = await fetch(POKEMON_DATA_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch Pokemon data: ${response.status}`);
    }

    const pokemon = (await response.json()) as Pokemon[];
    log(`Loaded pokemon data from remote URL: ${POKEMON_DATA_URL}`);
    return buildPokemonMap(pokemon);
  } catch (_error) {
    warn('Remote Pokemon fetch failed, falling back to local JSON');

    try {
      const pokemon = localPokemonData as unknown as Pokemon[];
      log('Loaded pokemon data from bundled local JSON fallback');
      return buildPokemonMap(pokemon);
    } catch (_fallbackError) {
      logError('Local Pokemon fallback failed, returning stale/empty cache');

      if (cachedMap) {
        return cachedMap;
      }

      return new Map<string, Pokemon>();
    }
  }
};

export const getPokemonMap = async (): Promise<Map<string, Pokemon>> => {
  log('Requesting Pokemon map');

  if (isCacheFresh() && cachedMap) {
    log('Serving Pokemon map from cache');
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
      warn('Pokemon fetch failed, serving stale cache', error);
      return cachedMap;
    }

    throw error;
  }
};

export const resolvePokemonToken = (
  token: string,
  pokemonMap: Map<string, Pokemon>
): Pokemon | undefined => {
  const exactMatch = pokemonMap.get(normalize(token));
  if (exactMatch) {
    return exactMatch;
  }

  const fuzzyMatch = getBestFuzzyPokemonMatch(token, Array.from(pokemonMap.values()));
  return fuzzyMatch?.pokemon;
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
  source: 'auto_remote_then_local_fallback',
  localPath: 'src/generated/pokemon.local.json',
});

export const __test__ = {
  getBestFuzzyPokemonMatch,
  normalizeForFuzzy,
  normalizeWordsForFuzzy,
  scorePokemonName,
};
