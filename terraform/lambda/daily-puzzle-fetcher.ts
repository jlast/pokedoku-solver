import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type ConstraintCategory = "regions" | "types" | "evolution" | "category";

interface ConstraintMapping {
  category: ConstraintCategory;
  value: string;
}

interface RawConstraint {
  type: string;
  obj: string | boolean;
}

interface RawPuzzle {
  type: string;
  date: string;
  x1: RawConstraint;
  x2: RawConstraint;
  x3: RawConstraint;
  y1: RawConstraint;
  y2: RawConstraint;
  y3: RawConstraint;
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
      return { category: "category", value: "Starter" };

    case "BABY":
      return { category: "category", value: "Baby" };

    case "PARADOX":
      return { category: "category", value: "Paradox" };

    case "EVOLUTION_BRANCHED":
      return { category: "category", value: "Is Branched" };

    case "FOSSIL": 
      return { category: "category", value: "Fossil" };

    default:
      return null;
  }
}

function extractPuzzleFromPush(pushContent: string): RawPuzzle | null {
  const puzzleMatch = pushContent.match(/\\"puzzle\\":\s*\{(.+?)\}(?=,\s*\\"isCurrentPuzzle\\")/s);
  if (!puzzleMatch) {
    return null;
  }

  const puzzleStr = `{${puzzleMatch[1]}}`;
  const unescapedStr = puzzleStr.replace(/\\"/g, '"');

  return JSON.parse(unescapedStr) as RawPuzzle;
}

async function fetchPuzzle() {
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

  const puzzle = extractPuzzleFromPush(puzzlePush);
  if (!puzzle) {
    throw new Error("Failed to parse puzzle data from page");
  }

  const rowConstraints = [puzzle.y1, puzzle.y2, puzzle.y3].map((c) => mapConstraintType(c.type, c.obj));
  const colConstraints = [puzzle.x1, puzzle.x2, puzzle.x3].map((c) => mapConstraintType(c.type, c.obj));

  if (rowConstraints.some((c) => c === null) || colConstraints.some((c) => c === null)) {
    throw new Error("Some constraints could not be mapped");
  }

  return {
    date: puzzle.date,
    type: puzzle.type,
    rowConstraints,
    colConstraints,
  };
}

export async function handler() {
  const bucketName = process.env.BUCKET_NAME;
  const objectKey = process.env.OBJECT_KEY || "today-puzzle.json";

  if (!bucketName) {
    throw new Error("BUCKET_NAME is required");
  }

  const puzzle = await fetchPuzzle();

  const datedObjectKey = `data/puzzles/${puzzle.date}.json`;

  const s3 = new S3Client({});

  await Promise.all([
    s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: JSON.stringify(puzzle, null, 2),
        ContentType: "application/json",
        CacheControl: "max-age=300, public",
      }),
    ),
    s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: datedObjectKey,
        Body: JSON.stringify(puzzle, null, 2),
        ContentType: "application/json",
        CacheControl: "max-age=300, public",
      }),
    ),
  ])

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Daily puzzle fetched and stored",
      bucket: bucketName,
      key: objectKey,
      date: puzzle.date,
    }),
  };
}
