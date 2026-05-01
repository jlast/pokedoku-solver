import { S3Client } from "@aws-sdk/client-s3";
import {
  buildCategoryPairStatsFiles,
  buildCategoryStatsFiles,
  buildPokemonRecentAppearanceFile,
  buildPokemonStatsFiles,
  buildStats,
  summarizeFormIdQuality,
} from "./core";
import {
  listPuzzleKeys,
  mapWithConcurrency,
  putJsonToS3,
  readPokemonListFromS3,
  readPuzzleFromS3,
} from "./io-s3";

const BUCKET_NAME = process.env.BUCKET_NAME!;
const OUTPUT_KEY = process.env.OBJECT_KEY || "data/runtime/puzzle-stats.json";
const PUZZLES_PREFIX = "data/runtime/puzzles/";
const POKEMON_DATA_KEY = "data/pokemon.json";
const POKEMON_STATS_PREFIX = "data/runtime/pokemon/";
const CATEGORY_STATS_PREFIX = "data/runtime/categories/";
const CATEGORY_PAIR_STATS_PREFIX = "data/runtime/category-pairs/";
const POKEMON_LAST_USABLE_KEY = "data/runtime/pokemon-last-usable.json";
const IO_CONCURRENCY = Number(process.env.IO_CONCURRENCY ?? 20);
const LOG_EVERY_N = Number(process.env.LOG_EVERY_N ?? 100);
const FORM_ID_MISSING_WARN_THRESHOLD = Number(process.env.FORM_ID_MISSING_WARN_THRESHOLD ?? 1);
const FORM_ID_MISSING_FAIL_THRESHOLD = Number(process.env.FORM_ID_MISSING_FAIL_THRESHOLD ?? 0);

export async function handler() {
  const startedAt = Date.now();
  if (!BUCKET_NAME) throw new Error("BUCKET_NAME is required");

  console.log("puzzle-statistics handler started", {
    bucket: BUCKET_NAME,
    outputKey: OUTPUT_KEY,
    puzzlesPrefix: PUZZLES_PREFIX,
    pokemonStatsPrefix: POKEMON_STATS_PREFIX,
    categoryStatsPrefix: CATEGORY_STATS_PREFIX,
    categoryPairStatsPrefix: CATEGORY_PAIR_STATS_PREFIX,
    ioConcurrency: IO_CONCURRENCY,
    logEvery: LOG_EVERY_N,
  });

  const s3 = new S3Client({});
  const listStartedAt = Date.now();
  const keys = await listPuzzleKeys(s3, BUCKET_NAME, PUZZLES_PREFIX);
  console.log("listed puzzle keys", { keyCount: keys.length, elapsedMs: Date.now() - listStartedAt });
  if (keys.length === 0) throw new Error(`No puzzle files found under ${PUZZLES_PREFIX}`);

  const puzzles = await mapWithConcurrency(
    keys,
    IO_CONCURRENCY,
    (key) => readPuzzleFromS3(s3, BUCKET_NAME, key),
    { label: "readPuzzle", logEvery: LOG_EVERY_N },
  );
  console.log("puzzles loaded", {
    puzzleCount: puzzles.length,
    uniqueDates: new Set(puzzles.map((puzzle) => puzzle.date)).size,
  });

  const pokemonReadStartedAt = Date.now();
  const pokemon = await readPokemonListFromS3(s3, BUCKET_NAME, POKEMON_DATA_KEY);
  console.log("pokemon list loaded", { pokemonCount: pokemon.length, elapsedMs: Date.now() - pokemonReadStartedAt });

  const formIdQuality = summarizeFormIdQuality(pokemon);
  if (formIdQuality.missingFormIdCount >= FORM_ID_MISSING_WARN_THRESHOLD) {
    console.warn("pokemon formId quality warning", {
      totalPokemon: formIdQuality.total,
      missingFormIdCount: formIdQuality.missingFormIdCount,
      missingFormIdSampleIds: formIdQuality.missingFormIdSampleIds,
      warnThreshold: FORM_ID_MISSING_WARN_THRESHOLD,
      failThreshold: FORM_ID_MISSING_FAIL_THRESHOLD,
    });
  }
  if (formIdQuality.missingFormIdCount > FORM_ID_MISSING_FAIL_THRESHOLD) {
    throw new Error(
      `pokemon formId quality check failed: missingFormIdCount=${formIdQuality.missingFormIdCount}, failThreshold=${FORM_ID_MISSING_FAIL_THRESHOLD}`,
    );
  }

  const statsStartedAt = Date.now();
  const stats = buildStats(puzzles, pokemon);
  console.log("overall stats built", { puzzlesAnalyzed: stats.puzzlesAnalyzed, elapsedMs: Date.now() - statsStartedAt });

  const pokemonStatsStartedAt = Date.now();
  const pokemonStats = buildPokemonStatsFiles(puzzles, pokemon);
  console.log("pokemon stats files built", {
    fileCount: pokemonStats.files.length,
    skipped: pokemonStats.skipped,
    elapsedMs: Date.now() - pokemonStatsStartedAt,
  });

  const categoryStatsStartedAt = Date.now();
  const categoryStats = buildCategoryStatsFiles(puzzles);
  console.log("category stats files built", {
    fileCount: categoryStats.files.length,
    elapsedMs: Date.now() - categoryStatsStartedAt,
  });

  const categoryPairStatsStartedAt = Date.now();
  const categoryPairStats = buildCategoryPairStatsFiles(puzzles);
  console.log("category pair stats files built", {
    fileCount: categoryPairStats.files.length,
    elapsedMs: Date.now() - categoryPairStatsStartedAt,
  });

  const writeSummaryStartedAt = Date.now();
  await putJsonToS3(s3, BUCKET_NAME, OUTPUT_KEY, stats);
  console.log("wrote summary stats file", { key: OUTPUT_KEY, elapsedMs: Date.now() - writeSummaryStartedAt });

  const pokemonRecentAppearanceStartedAt = Date.now();
  const pokemonRecentAppearance = buildPokemonRecentAppearanceFile(puzzles, pokemon);
  await putJsonToS3(s3, BUCKET_NAME, POKEMON_LAST_USABLE_KEY, pokemonRecentAppearance);
  console.log("wrote pokemon recent appearance file", {
    key: POKEMON_LAST_USABLE_KEY,
    itemCount: pokemonRecentAppearance.items.length,
    elapsedMs: Date.now() - pokemonRecentAppearanceStartedAt,
  });

  await mapWithConcurrency(
    pokemonStats.files,
    IO_CONCURRENCY,
    async (pokemonStatsFile) => putJsonToS3(s3, BUCKET_NAME, `${POKEMON_STATS_PREFIX}${pokemonStatsFile.pokemonKeyId}-stats.json`, pokemonStatsFile),
    { label: "writePokemonStats", logEvery: LOG_EVERY_N },
  );

  await mapWithConcurrency(
    categoryStats.files,
    IO_CONCURRENCY,
    async (categoryStatsFile) => {
      const fileName = categoryStats.fileNameByCategoryId.get(categoryStatsFile.categoryId);
      if (!fileName) throw new Error(`Missing output filename for category ${categoryStatsFile.categoryId}`);
      await putJsonToS3(s3, BUCKET_NAME, `${CATEGORY_STATS_PREFIX}${fileName}`, categoryStatsFile);
    },
    { label: "writeCategoryStats", logEvery: LOG_EVERY_N },
  );

  await mapWithConcurrency(
    categoryPairStats.files,
    IO_CONCURRENCY,
    async (categoryPairStatsFile) => {
      const fileName = categoryPairStats.fileNameByPairSlug.get(categoryPairStatsFile.pairSlug);
      if (!fileName) throw new Error(`Missing output filename for pair ${categoryPairStatsFile.pairSlug}`);
      await putJsonToS3(s3, BUCKET_NAME, `${CATEGORY_PAIR_STATS_PREFIX}${fileName}`, categoryPairStatsFile);
    },
    { label: "writeCategoryPairStats", logEvery: LOG_EVERY_N },
  );

  console.log("puzzle-statistics handler completed", {
    totalElapsedMs: Date.now() - startedAt,
    puzzlesAnalyzed: stats.puzzlesAnalyzed,
    pokemonStatsWritten: pokemonStats.files.length,
    pokemonStatsSkipped: pokemonStats.skipped,
    categoryStatsWritten: categoryStats.files.length,
    categoryPairStatsWritten: categoryPairStats.files.length,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Puzzle stats generated",
      bucket: BUCKET_NAME,
      key: OUTPUT_KEY,
      puzzlesAnalyzed: stats.puzzlesAnalyzed,
      dateRange: stats.dateRange,
      pokemonStatsPrefix: POKEMON_STATS_PREFIX,
      pokemonStatsWritten: pokemonStats.files.length,
      pokemonStatsSkipped: pokemonStats.skipped,
      categoryStatsPrefix: CATEGORY_STATS_PREFIX,
      categoryStatsWritten: categoryStats.files.length,
      categoryPairStatsPrefix: CATEGORY_PAIR_STATS_PREFIX,
      categoryPairStatsWritten: categoryPairStats.files.length,
      pokemonRecentAppearanceKey: POKEMON_LAST_USABLE_KEY,
    }),
  };
}
