import type { Pokemon } from "@pokedoku-helper/shared-types";
import { FILTER_CATEGORIES, matchesConstraint } from "./shared/filters";
import { CATEGORY_COMBINATION_FILTER_KEYS } from "./shared/categoryCombinations";

type ConstraintCategory = "regions" | "types" | "evolution" | "category" | "move" | "ability";

interface ConstraintMapping {
  category: ConstraintCategory;
  value: string;
}

interface RawConstraint {
  type: string;
  obj: string | boolean;
}

type PuzzleType = "AUTOMATIC" | "SOCIAL_CREATOR" | "BONUS" | string;

export interface FeaturedPick {
  id: number;
  formId?: number;
  name: string;
  sprite?: string;
  dexDifficulty: string;
  dexDifficultyPercentile: number;
  globalCategoryCombinationCount: number;
}

export interface MappedPuzzle {
  date: string;
  type: PuzzleType;
  bonus: boolean;
  size: number;
  rowConstraints: ConstraintMapping[];
  colConstraints: ConstraintMapping[];
  featuredPick?: FeaturedPick;
}

export interface TodayPuzzleFile {
  puzzles: MappedPuzzle[];
  yesterdayPuzzle: MappedPuzzle | null;
}

function isConstraintMapping(value: unknown): value is ConstraintMapping {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ConstraintMapping).category === "string" &&
    typeof (value as ConstraintMapping).value === "string"
  );
}

export function isMappedPuzzle(value: unknown): value is MappedPuzzle {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as MappedPuzzle).date === "string" &&
    typeof (value as MappedPuzzle).type === "string" &&
    typeof (value as MappedPuzzle).bonus === "boolean" &&
    typeof (value as MappedPuzzle).size === "number" &&
    Array.isArray((value as MappedPuzzle).rowConstraints) &&
    Array.isArray((value as MappedPuzzle).colConstraints) &&
    (value as MappedPuzzle).rowConstraints.every(isConstraintMapping) &&
    (value as MappedPuzzle).colConstraints.every(isConstraintMapping)
  );
}

export function createTodayPuzzleFile(puzzles: MappedPuzzle[], yesterdayPuzzle: MappedPuzzle | null): TodayPuzzleFile {
  return {
    puzzles,
    yesterdayPuzzle,
  };
}

export function parseTodayPuzzleFile(value: unknown): TodayPuzzleFile {
  if (Array.isArray(value)) {
    return createTodayPuzzleFile(value.filter(isMappedPuzzle), null);
  }

  if (isMappedPuzzle(value)) {
    return createTodayPuzzleFile([value], null);
  }

  if (typeof value === "object" && value !== null) {
    const puzzles = Array.isArray((value as TodayPuzzleFile).puzzles)
      ? (value as TodayPuzzleFile).puzzles.filter(isMappedPuzzle)
      : [];
    const yesterdayPuzzle = isMappedPuzzle((value as TodayPuzzleFile).yesterdayPuzzle)
      ? (value as TodayPuzzleFile).yesterdayPuzzle
      : null;

    if (puzzles.length > 0) {
      return createTodayPuzzleFile(puzzles, yesterdayPuzzle);
    }
  }

  throw new Error("Failed to parse today puzzle data");
}

interface RawPuzzle {
  type: string;
  date: string;
  size?: number;
  bonus?: boolean;
  [key: string]: unknown;
}

const GENERATION_MAP: Record<string, string> = {
  "generation-i": "Kanto",
  "generation-ii": "Johto",
  "generation-iii": "Hoenn",
  "generation-iv": "Sinnoh",
  "generation-v": "Unova",
  "generation-vi": "Kalos",
  "generation-vii": "Alola",
  "generation-viii": "Galar",
  "generation-ix": "Paldea",
};

const EVOLUTION_MAP: Record<string, string> = {
  none: "No Evolution Line",
  premature: "Not Fully Evolved",
  start: "First Stage",
  middle: "Middle Stage",
  final: "Final Stage",
};

const EVOLVED_BY_MAP: Record<string, string> = {
  item: "Evolved by Item",
  "level-up": "Evolved by Level",
  trade: "Evolved by Trade",
  friendship: "Evolved by Friendship",
};

function mapConstraintType(type: string, obj: string | boolean): ConstraintMapping | null {
  switch (type) {
    case "GENERATION":
      if (typeof obj === "string" && GENERATION_MAP[obj]) {
        return { category: "regions", value: GENERATION_MAP[obj] };
      }
      return null;
    case "HISUI":
      return { category: "regions", value: "Hisui" };
    case "POKEMON_TYPE":
      if (typeof obj === "string") {
        return { category: "types", value: obj.charAt(0).toUpperCase() + obj.slice(1) };
      }
      return null;
    case "EVOLUTION_POSITION":
      if (typeof obj === "string" && EVOLUTION_MAP[obj]) {
        return { category: "evolution", value: EVOLUTION_MAP[obj] };
      }
      return null;
    case "EVOLVED_BY":
      if (typeof obj === "string" && EVOLVED_BY_MAP[obj]) {
        return { category: "evolution", value: EVOLVED_BY_MAP[obj] };
      }
      return null;
    case "MONOTYPE":
      return { category: "types", value: "Monotype" };
    case "DUAL_TYPE":
      return { category: "types", value: "Dualtype" };
    case "LEGENDARY":
      return { category: "category", value: "Legendary" };
    case "GMAX":
      return { category: "category", value: "Gigantamax" };
    case "MEGA":
      return { category: "category", value: "Mega Evolution" };
    case "MYTHICAL":
      return { category: "category", value: "Mythical" };
    case "ULTRA_BEAST":
      return { category: "category", value: "Ultra Beast" };
    case "STARTER":
    case "FIRST_PARTNER":
      return { category: "category", value: "First Partner" };
    case "BABY":
      return { category: "category", value: "Baby" };
    case "PARADOX":
      return { category: "category", value: "Paradox" };
    case "EVOLUTION_BRANCHED":
      return { category: "evolution", value: "Branched Evolution" };
    case "FOSSIL":
      return { category: "category", value: "Fossil" };
    case "POKEMON_MOVE":
      return { category: "move", value: obj.charAt(0).toUpperCase() + obj.slice(1) };
    default:
      return null;
  }
}

function isRawConstraint(value: unknown): value is RawConstraint {
  return typeof value === "object" && value !== null && "type" in value && "obj" in value && typeof (value as RawConstraint).type === "string";
}

function extractAxisConstraints(puzzle: RawPuzzle, axis: "x" | "y"): RawConstraint[] {
  const keys = Object.keys(puzzle)
    .filter((key) => key.startsWith(axis) && /^\d+$/.test(key.slice(1)))
    .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  return keys.map((key) => puzzle[key]).filter((value): value is RawConstraint => isRawConstraint(value));
}

function mapPuzzle(puzzle: RawPuzzle): MappedPuzzle {
  const rawRowConstraints = extractAxisConstraints(puzzle, "y");
  const rawColConstraints = extractAxisConstraints(puzzle, "x");
  if (rawRowConstraints.length === 0 || rawColConstraints.length === 0) {
    throw new Error("Failed to detect puzzle axis constraints");
  }
  const rowConstraints = rawRowConstraints.map((c) => mapConstraintType(c.type, c.obj));
  const colConstraints = rawColConstraints.map((c) => mapConstraintType(c.type, c.obj));
  if (rowConstraints.some((c) => c === null) || colConstraints.some((c) => c === null)) {
    throw new Error("Some constraints could not be mapped");
  }
  if (typeof puzzle.size === "number") {
    const expectedAxisLength = Math.sqrt(puzzle.size);
    if (!Number.isInteger(expectedAxisLength) || rowConstraints.length !== expectedAxisLength || colConstraints.length !== expectedAxisLength) {
      throw new Error(`Puzzle size mismatch: size=${puzzle.size}, rows=${rowConstraints.length}, cols=${colConstraints.length}`);
    }
  }
  return {
    date: puzzle.date,
    type: puzzle.type as PuzzleType,
    bonus: puzzle.type === "BONUS" || puzzle.bonus === true,
    size: typeof puzzle.size === "number" ? puzzle.size : rowConstraints.length * colConstraints.length,
    rowConstraints: rowConstraints as ConstraintMapping[],
    colConstraints: colConstraints as ConstraintMapping[],
  };
}

const DIFFICULTY_RANK: Record<string, number> = {
  Easy: 0,
  Normal: 1,
  Hard: 2,
  Expert: 3,
  Nightmare: 4,
  Impossible: 5,
};

function compareByHardest(a: Pokemon, b: Pokemon): number {
  const aDifficulty = a.dexDifficulty ? DIFFICULTY_RANK[a.dexDifficulty] ?? -1 : -1;
  const bDifficulty = b.dexDifficulty ? DIFFICULTY_RANK[b.dexDifficulty] ?? -1 : -1;
  if (aDifficulty !== bDifficulty) return bDifficulty - aDifficulty;

  const aPercentile = a.dexDifficultyPercentile ?? Number.NEGATIVE_INFINITY;
  const bPercentile = b.dexDifficultyPercentile ?? Number.NEGATIVE_INFINITY;
  if (aPercentile !== bPercentile) return bPercentile - aPercentile;

  return a.id - b.id;
}

function buildEvolutionLineResolver(pokemon: Pokemon[]): (id: number) => string {
  const nodes = new Map<number, Set<number>>();
  const byId = new Map<number, Pokemon>();
  for (const entry of pokemon) {
    byId.set(entry.id, entry);
    if (!nodes.has(entry.id)) nodes.set(entry.id, new Set<number>());
  }

  for (const entry of pokemon) {
    const neighbors = nodes.get(entry.id)!;
    const from = entry.evolution?.from ?? [];
    const to = entry.evolution?.to ?? [];
    for (const neighborId of [...from, ...to]) {
      if (!byId.has(neighborId)) continue;
      neighbors.add(neighborId);
      nodes.get(neighborId)?.add(entry.id);
    }
  }

  const visited = new Set<number>();
  const lineById = new Map<number, string>();

  for (const nodeId of nodes.keys()) {
    if (visited.has(nodeId)) continue;
    const stack = [nodeId];
    const component: number[] = [];
    visited.add(nodeId);
    while (stack.length > 0) {
      const current = stack.pop()!;
      component.push(current);
      for (const neighbor of nodes.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      }
    }

    const key = String(Math.min(...component));
    for (const id of component) lineById.set(id, key);
  }

  return (id: number) => lineById.get(id) ?? String(id);
}

function countGlobalCategoryCombinationsForPokemon(entry: Pokemon, pokemon: Pokemon[]): number {
  const options = FILTER_CATEGORIES.filter((category) => CATEGORY_COMBINATION_FILTER_KEYS.includes(category.key)).flatMap((category) =>
    category.options.map((option) => ({
      constraint: { category: category.key, value: option.name },
    })),
  );

  const resolveEvolutionLine = buildEvolutionLineResolver(pokemon);
  let count = 0;

  for (let i = 0; i < options.length; i++) {
    for (let j = i + 1; j < options.length; j++) {
      const left = options[i];
      const right = options[j];

      if (!matchesConstraint(entry, left.constraint) || !matchesConstraint(entry, right.constraint)) {
        continue;
      }

      const matching = pokemon.filter((candidate) =>
        matchesConstraint(candidate, left.constraint) && matchesConstraint(candidate, right.constraint),
      );

      if (matching.length === 0) continue;

      const lineCount = new Set(matching.map((candidate) => resolveEvolutionLine(candidate.id))).size;
      if (lineCount <= 1) continue;

      count += 1;
    }
  }

  return count;
}

export function enrichPuzzlesWithFeaturedPick(puzzles: MappedPuzzle[], pokemon: Pokemon[]): MappedPuzzle[] {
  return puzzles.map((puzzle) => {
    const possiblePokemon = pokemon.filter((entry) =>
      puzzle.rowConstraints.some((row) =>
        puzzle.colConstraints.some((col) => matchesConstraint(entry, row) && matchesConstraint(entry, col)),
      ),
    );

    const featured = [...possiblePokemon].sort(compareByHardest)[0];
    if (!featured) return puzzle;

    const globalCategoryCombinationCount = countGlobalCategoryCombinationsForPokemon(featured, pokemon);

    return {
      ...puzzle,
      featuredPick: {
        id: featured.id,
        formId: featured.formId,
        name: featured.name,
        sprite: featured.sprite,
        dexDifficulty: featured.dexDifficulty,
        dexDifficultyPercentile: featured.dexDifficultyPercentile,
        globalCategoryCombinationCount,
      },
    };
  });
}

class CookieJar {
  private readonly cookies = new Map<string, string>();

  addSetCookieHeaders(headers: Headers) {
    const getSetCookie = headers.getSetCookie?.bind(headers);
    const setCookies = getSetCookie ? getSetCookie() : this.getFallbackSetCookies(headers);

    for (const setCookie of setCookies) {
      const [cookiePair] = setCookie.split(";", 1);
      const separatorIndex = cookiePair.indexOf("=");
      if (separatorIndex <= 0) continue;

      const name = cookiePair.slice(0, separatorIndex).trim();
      const value = cookiePair.slice(separatorIndex + 1).trim();
      if (!name) continue;

      this.cookies.set(name, value);
    }
  }

  has(name: string): boolean {
    return this.cookies.has(name);
  }

  toHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  private getFallbackSetCookies(headers: Headers): string[] {
    const raw = headers.get("set-cookie");
    return raw ? [raw] : [];
  }
}

async function fetchBonusPuzzle(date: string): Promise<RawPuzzle | null> {
  const cookieJar = new CookieJar();

  const csrfResponse = await fetch("https://pokedoku.com/api/auth/csrf");
  cookieJar.addSetCookieHeaders(csrfResponse.headers);
  if (!csrfResponse.ok) {
    throw new Error(`Failed to fetch Pokedoku CSRF token: ${csrfResponse.status} ${csrfResponse.statusText}`);
  }

  const csrfData = (await csrfResponse.json()) as { csrfToken?: string };
  if (!csrfData.csrfToken) {
    throw new Error("Pokedoku CSRF response did not include a csrfToken");
  }

  const authResponse = await fetch("https://pokedoku.com/api/auth/callback/anon", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: cookieJar.toHeader(),
    },
    body: new URLSearchParams({
      csrfToken: csrfData.csrfToken,
      callbackUrl: "https://pokedoku.com/",
      json: "true",
    }),
  });

  cookieJar.addSetCookieHeaders(authResponse.headers);
  if (!authResponse.ok) {
    throw new Error(`Failed to authenticate Pokedoku anon session: ${authResponse.status} ${authResponse.statusText}`);
  }

  if (!cookieJar.has("__Secure-next-auth.session-token")) {
    throw new Error("Pokedoku anon auth did not return a session token");
  }

  const bonusResponse = await fetch(`https://api.pokedoku.com/api/puzzle/bonus/${date}`, {
    headers: {
      cookie: cookieJar.toHeader(),
    },
  });

  if (!bonusResponse.ok) {
    if (bonusResponse.status === 404) {
      return null;
    }
    throw new Error(`Failed to fetch bonus puzzle: ${bonusResponse.status} ${bonusResponse.statusText}`);
  }

  const rawText = await bonusResponse.text();
  if (!rawText.trim()) {
    return null;
  }

  return JSON.parse(rawText) as RawPuzzle;
}

export async function fetchPuzzles(): Promise<MappedPuzzle[]> {
  const response = await fetch("https://api.pokedoku.com/api/puzzle/current");
  if (!response.ok) {
    throw new Error(`Failed to fetch puzzle: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as RawPuzzle | RawPuzzle[];
  const rawPuzzles = Array.isArray(data) ? data : [data];
  if (rawPuzzles.length === 0) {
    throw new Error("Failed to parse puzzle data from API response");
  }

  const liveDate = rawPuzzles[0]?.date;
  const hasBonusPuzzle = rawPuzzles.some((puzzle) => puzzle.type === "BONUS" || puzzle.bonus === true);

  if (!hasBonusPuzzle && liveDate) {
    try {
      const bonusPuzzle = await fetchBonusPuzzle(liveDate);
      if (bonusPuzzle) {
        rawPuzzles.push(bonusPuzzle);
      }
    } catch (error) {
      console.warn("Failed to fetch bonus puzzle via authenticated flow:", error);
    }
  }

  return rawPuzzles.map(mapPuzzle);
}
