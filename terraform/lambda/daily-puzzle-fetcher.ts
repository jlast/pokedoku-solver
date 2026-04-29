import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { fetchPuzzles } from "../../lib/puzzle-fetch-core";

export async function handler() {
  const bucketName = process.env.BUCKET_NAME;
  const objectKey = process.env.OBJECT_KEY || "data/runtime/today-puzzle.json";

  if (!bucketName) {
    throw new Error("BUCKET_NAME is required");
  }

  const puzzles = await fetchPuzzles();
  const regularPuzzle = puzzles.find((p) => p.type === "AUTOMATIC" || p.type === "SOCIAL_CREATOR");
  if (!regularPuzzle) {
    throw new Error("Could not find AUTOMATIC or SOCIAL_CREATOR puzzle");
  }

  const s3 = new S3Client({});

  const datedWrites = puzzles.map((puzzle) => {
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
        Body: JSON.stringify(puzzles, null, 2),
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
      puzzleTypes: puzzles.map((p) => p.type),
    }),
  };
}
