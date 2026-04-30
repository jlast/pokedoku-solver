type ConstraintCategory = "regions" | "types" | "evolution" | "category";

interface ConstraintMapping {
  category: ConstraintCategory;
  value: string;
}

interface RawConstraint {
  type: string;
  obj: string | boolean;
}

type PuzzleType = "AUTOMATIC" | "SOCIAL_CREATOR" | "BONUS" | string;

export interface MappedPuzzle {
  date: string;
  type: PuzzleType;
  bonus: boolean;
  size: number;
  rowConstraints: ConstraintMapping[];
  colConstraints: ConstraintMapping[];
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
  level: "Evolved by Level",
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
      return { category: "category", value: "Branched evolution" };
    case "FOSSIL":
      return { category: "category", value: "Fossil" };
    default:
      return null;
  }
}

function extractPuzzlesFromPush(pushContent: string): RawPuzzle[] {
  const matches = pushContent.matchAll(/\\"puzzle\\":\s*(\{.+?\})(?=,\s*\\"isCurrentPuzzle\\")/gs);
  const puzzles: RawPuzzle[] = [];
  for (const match of matches) {
    const unescapedStr = match[1].replace(/\\"/g, '"');
    puzzles.push(JSON.parse(unescapedStr) as RawPuzzle);
  }
  return puzzles;
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

export async function fetchPuzzles(): Promise<MappedPuzzle[]> {
  const response = await fetch("https://pokedoku.com/");
  if (!response.ok) {
    throw new Error(`Failed to fetch puzzle: ${response.status} ${response.statusText}`);
  }
  const html = await response.text();
  let pushStart = html.indexOf("__next_f");
  let puzzlePush = "";
  while (pushStart !== -1) {
    const pushEnd = html.indexOf("])</script>", pushStart);
    if (pushEnd !== -1) {
      const push = html.slice(pushStart, pushEnd + 18);
      if (push.includes('\\"puzzle\\"')) {
        puzzlePush = push;
        break;
      }
    }
    pushStart = html.indexOf("__next_f", pushStart + 1);
  }
  if (!puzzlePush) {
    throw new Error("Could not find puzzle data in page");
  }
  const rawPuzzles = extractPuzzlesFromPush(puzzlePush);
  if (rawPuzzles.length === 0) {
    throw new Error("Failed to parse puzzle data from page");
  }
  return rawPuzzles.map(mapPuzzle);
}
