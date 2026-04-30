import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Pokemon } from "../../../lib/shared/types";
import type { Puzzle } from "./types";

export async function streamToString(stream: unknown): Promise<string> {
  if (!stream || typeof stream !== "object" || !("transformToString" in stream)) {
    throw new Error("Unable to read S3 object body");
  }
  return (stream as { transformToString: () => Promise<string> }).transformToString();
}

export async function listPuzzleKeys(s3: S3Client, bucketName: string, puzzlesPrefix: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: puzzlesPrefix,
        ContinuationToken: continuationToken,
      }),
    );

    for (const object of response.Contents ?? []) {
      if (object.Key && object.Key.startsWith(puzzlesPrefix) && object.Key.endsWith(".json")) {
        keys.push(object.Key);
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return keys;
}

export async function readPuzzleFromS3(s3: S3Client, bucketName: string, key: string): Promise<Puzzle> {
  const response = await s3.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
  const body = await streamToString(response.Body);
  const puzzle = JSON.parse(body) as Puzzle;

  if (!puzzle.date) throw new Error(`Puzzle ${key} is missing date`);
  if (!Array.isArray(puzzle.rowConstraints) || !Array.isArray(puzzle.colConstraints)) {
    throw new Error(`Puzzle ${key} is missing rowConstraints or colConstraints`);
  }

  return puzzle;
}

export async function readPokemonListFromS3(s3: S3Client, bucketName: string, key: string): Promise<Pokemon[]> {
  const response = await s3.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
  const body = await streamToString(response.Body);
  const pokemon = JSON.parse(body) as Pokemon[];
  if (!Array.isArray(pokemon)) throw new Error(`${key} does not contain a JSON array`);
  return pokemon;
}

export async function putJsonToS3(
  s3: S3Client,
  bucketName: string,
  key: string,
  payload: unknown,
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: JSON.stringify(payload, null, 2),
      ContentType: "application/json",
      CacheControl: "max-age=300, public",
    }),
  );
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
  options?: { label?: string; logEvery?: number },
): Promise<R[]> {
  if (items.length === 0) return [];

  const safeConcurrency = Math.max(1, Math.min(concurrency, items.length));
  const results: R[] = new Array(items.length);
  const startedAt = Date.now();
  const label = options?.label ?? "mapWithConcurrency";
  const logEvery = Math.max(1, options?.logEvery ?? 100);
  let nextIndex = 0;
  let completed = 0;

  console.log(`[${label}] start`, { total: items.length, concurrency: safeConcurrency, logEvery });

  const workers = Array.from({ length: safeConcurrency }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
      completed += 1;

      if (completed % logEvery === 0 || completed === items.length) {
        console.log(`[${label}] progress`, {
          completed,
          total: items.length,
          percent: Math.round((completed / items.length) * 100),
          elapsedMs: Date.now() - startedAt,
        });
      }
    }
  });

  await Promise.all(workers);
  console.log(`[${label}] done`, { total: items.length, elapsedMs: Date.now() - startedAt });
  return results;
}
