import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

type ConstraintCategory = "regions" | "types" | "evolution" | "category";

interface ConstraintMapping {
  category: ConstraintCategory;
  value: string;
}

interface Puzzle {
  date: string;
  type: string;
  rowConstraints: ConstraintMapping[];
  colConstraints: ConstraintMapping[];
}

interface CategoryCount {
  categoryId: string;
  count: number;
}

interface CategoryPair {
  categories: [string, string];
  count: number;
}

interface CategoryStats {
  puzzlesAnalyzed: number;
  dateRange: {
    from: string;
    to: string;
  };
  categoryCounts: CategoryCount[];
  categoryPairs: CategoryPair[];
}

const BUCKET_NAME = process.env.BUCKET_NAME!;
const OUTPUT_KEY = process.env.OBJECT_KEY || "data/runtime/puzzle-stats.json";
const PUZZLES_PREFIX = "data/runtime/puzzles/";

const s3 = new S3Client({});

function toCategoryId(constraint: ConstraintMapping): string {
  return `${constraint.category}:${constraint.value}`;
}

async function streamToString(stream: unknown): Promise<string> {
  if (!stream || typeof stream !== "object" || !("transformToString" in stream)) {
    throw new Error("Unable to read S3 object body");
  }

  return (stream as { transformToString: () => Promise<string> }).transformToString();
}

async function listPuzzleKeys(): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: PUZZLES_PREFIX,
        ContinuationToken: continuationToken,
      }),
    );

    for (const object of response.Contents ?? []) {
      if (
        object.Key &&
        object.Key.startsWith(PUZZLES_PREFIX) &&
        object.Key.endsWith(".json")
      ) {
        keys.push(object.Key);
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return keys;
}

async function readPuzzle(key: string): Promise<Puzzle> {
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }),
  );

  const body = await streamToString(response.Body);
  const puzzle = JSON.parse(body) as Puzzle;

  if (!puzzle.date) {
    throw new Error(`Puzzle ${key} is missing date`);
  }

  if (!Array.isArray(puzzle.rowConstraints) || !Array.isArray(puzzle.colConstraints)) {
    throw new Error(`Puzzle ${key} is missing rowConstraints or colConstraints`);
  }

  return puzzle;
}

function increment(map: Map<string, number>, key: string, amount = 1): void {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function buildStats(puzzles: Puzzle[]): CategoryStats {
  const categoryCounts = new Map<string, number>();
  const categoryPairs = new Map<string, number>();

  const dates = puzzles.map((puzzle) => puzzle.date).sort();

  for (const puzzle of puzzles) {
    const rowCategoryIds = puzzle.rowConstraints.map(toCategoryId);
    const colCategoryIds = puzzle.colConstraints.map(toCategoryId);

    // Count categories (rows + columns)
    for (const categoryId of [...rowCategoryIds, ...colCategoryIds]) {
      increment(categoryCounts, categoryId);
    }

    // Count unordered pairs
    for (const rowCategoryId of rowCategoryIds) {
      for (const columnCategoryId of colCategoryIds) {
        const [a, b] = [rowCategoryId, columnCategoryId].sort();
        increment(categoryPairs, `${a}||${b}`);
      }
    }
  }

  return {
    puzzlesAnalyzed: puzzles.length,
    dateRange: {
      from: dates[0] ?? "",
      to: dates[dates.length - 1] ?? "",
    },
    categoryCounts: Array.from(categoryCounts.entries())
      .map(([categoryId, count]) => ({ categoryId, count }))
      .sort((a, b) => b.count - a.count || a.categoryId.localeCompare(b.categoryId)),

    categoryPairs: Array.from(categoryPairs.entries())
      .map(([pairKey, count]) => {
        const categories = pairKey.split("||") as [string, string];

        return {
          categories,
          count,
        };
      })
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;

        const firstCompare = a.categories[0].localeCompare(b.categories[0]);
        if (firstCompare !== 0) return firstCompare;

        return a.categories[1].localeCompare(b.categories[1]);
      }),
  };
}

export async function handler() {
  if (!BUCKET_NAME) {
    throw new Error("BUCKET_NAME is required");
  }

  const keys = await listPuzzleKeys();

  if (keys.length === 0) {
    throw new Error(`No puzzle files found under ${PUZZLES_PREFIX}`);
  }

  const puzzles = await Promise.all(keys.map(readPuzzle));
  const stats = buildStats(puzzles);

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: OUTPUT_KEY,
      Body: JSON.stringify(stats, null, 2),
      ContentType: "application/json",
      CacheControl: "max-age=300, public",
    }),
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Puzzle stats generated",
      bucket: BUCKET_NAME,
      key: OUTPUT_KEY,
      puzzlesAnalyzed: stats.puzzlesAnalyzed,
      dateRange: stats.dateRange,
    }),
  };
}
