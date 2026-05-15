import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { enrichPuzzlesWithFeaturedPick, fetchPuzzles } from "../../lib/puzzle-fetch-core";
import { readPokemonListFromS3 } from "./puzzle-statistics/io-s3";

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

  const datedWrites = enrichedPuzzles.map((puzzle) => {
    const suffix = puzzle.type === "BONUS" ? "-bonus" : "";
    const datedObjectKey = `data/runtime/puzzles/${puzzle.date}${suffix}.json`;

    return s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: datedObjectKey,
        Body: JSON.stringify(puzzle, null, 2),
        ContentType: "application/json",
        CacheControl: "max-age=300, public",
      }),
    );
  });

  await Promise.all([
    s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: JSON.stringify(enrichedPuzzles, null, 2),
        ContentType: "application/json",
        CacheControl: "max-age=300, public",
      }),
    ),
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
