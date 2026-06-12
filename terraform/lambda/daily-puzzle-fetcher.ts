import { S3Client } from "@aws-sdk/client-s3";
import { createTodayPuzzleFile, enrichPuzzlesWithFeaturedPick, fetchPuzzles, type MappedPuzzle } from "../../lib/puzzle-fetch-core";
import { putJsonToS3, readPokemonListFromS3, readPuzzleFromS3 } from "./puzzle-statistics/io-s3";

function getPreviousDate(date: string): string {
  const previousDate = new Date(`${date}T00:00:00Z`);
  previousDate.setUTCDate(previousDate.getUTCDate() - 1);
  return previousDate.toISOString().slice(0, 10);
}

function isRegularPuzzle(puzzle: MappedPuzzle): boolean {
  return puzzle.type !== "BONUS" && puzzle.bonus !== true;
}

function toMappedPuzzle(puzzle: {
  date: string;
  type: string;
  bonus?: boolean;
  size?: number;
  rowConstraints: MappedPuzzle["rowConstraints"];
  colConstraints: MappedPuzzle["colConstraints"];
  featuredPick?: MappedPuzzle["featuredPick"];
}): MappedPuzzle {
  return {
    date: puzzle.date,
    type: puzzle.type,
    bonus: puzzle.type === "BONUS" || puzzle.bonus === true,
    size: typeof puzzle.size === "number" ? puzzle.size : puzzle.rowConstraints.length * puzzle.colConstraints.length,
    rowConstraints: puzzle.rowConstraints,
    colConstraints: puzzle.colConstraints,
    featuredPick: puzzle.featuredPick,
  };
}

async function readYesterdayPuzzle(s3: S3Client, bucketName: string, regularPuzzle: MappedPuzzle): Promise<MappedPuzzle | null> {
  const yesterdayPuzzleKey = `data/runtime/puzzles/${getPreviousDate(regularPuzzle.date)}.json`;

  try {
    const puzzle = await readPuzzleFromS3(s3, bucketName, yesterdayPuzzleKey);
    const mappedPuzzle = toMappedPuzzle(puzzle);
    return isRegularPuzzle(mappedPuzzle) ? mappedPuzzle : null;
  } catch {
    return null;
  }
}

export async function handler() {
  const bucketName = process.env.BUCKET_NAME;
  const objectKey = process.env.OBJECT_KEY || "data/runtime/today-puzzle.json";
  const pokemonDataKey = "data/pokemon.json";

  if (!bucketName) {
    throw new Error("BUCKET_NAME is required");
  }

  const puzzles = await fetchPuzzles();
  const regularPuzzle = puzzles.find((p) => p.type === "AUTOMATIC" || p.type === "SOCIAL_CREATOR");
  if (!regularPuzzle) {
    throw new Error("Could not find AUTOMATIC or SOCIAL_CREATOR puzzle");
  }

  const s3 = new S3Client({});
  const pokemon = await readPokemonListFromS3(s3, bucketName, pokemonDataKey);
  const enrichedPuzzles = enrichPuzzlesWithFeaturedPick(puzzles, pokemon);
  const yesterdayPuzzle = await readYesterdayPuzzle(s3, bucketName, regularPuzzle);
  const todayPuzzleFile = createTodayPuzzleFile(enrichedPuzzles, yesterdayPuzzle);

  const datedWrites = enrichedPuzzles.map((puzzle) => {
    const suffix = puzzle.type === "BONUS" ? "-bonus" : "";
    const datedObjectKey = `data/runtime/puzzles/${puzzle.date}${suffix}.json`;

    return putJsonToS3(s3, bucketName, datedObjectKey, puzzle);
  });

  await Promise.all([
    putJsonToS3(s3, bucketName, objectKey, todayPuzzleFile),
    ...datedWrites,
  ]);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Daily puzzle fetched and stored",
      bucket: bucketName,
      key: objectKey,
      date: regularPuzzle.date,
      puzzleTypes: enrichedPuzzles.map((p) => p.type),
    }),
  };
}
