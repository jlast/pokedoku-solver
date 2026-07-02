import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';
import {
  createTodayPuzzleFile,
  enrichPuzzlesWithFeaturedPick,
  parseTodayPuzzleFile,
  type MappedPuzzle,
} from '../../lib/puzzle-fetch-core';
import { findConstraintOption } from '../../lib/shared/filters';
import {
  authenticate,
  badRequest,
  fingerprintUser,
  forbidden,
  internalError,
  logError,
  logInfo,
  ok,
  requestMeta,
} from './public-api-shared';
import { putJsonToS3, readPokemonListFromS3, streamToString } from './puzzle-statistics/io-s3';
import { touchUserActivity } from './user-activity-shared';

type ApiConstraint = {
  category: string;
  value: string;
};

type AdminBonusPuzzleRequest = {
  date: string;
  rowConstraints: ApiConstraint[];
  colConstraints: ApiConstraint[];
};

const RUNTIME_BUCKET_NAME = process.env.RUNTIME_BUCKET_NAME ?? '';
const TODAY_PUZZLE_KEY = process.env.TODAY_PUZZLE_KEY ?? 'data/runtime/today-puzzle.json';
const POKEMON_DATA_KEY = process.env.POKEMON_DATA_KEY ?? 'data/pokemon.json';
const PUZZLES_PREFIX = process.env.PUZZLES_PREFIX ?? 'data/runtime/puzzles/';
const CLOUDFRONT_DISTRIBUTION_ID = process.env.CLOUDFRONT_DISTRIBUTION_ID ?? '';
const GRID_AXIS_SIZE = 3;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const CUSTOM_TO_RUNTIME_CATEGORY: Record<string, MappedPuzzle['rowConstraints'][number]['category']> = {
  type: 'types',
  region: 'regions',
  evolution: 'evolution',
  category: 'category',
  move: 'move',
  ability: 'ability',
};

function validateConstraintArray(
  value: unknown
): ApiConstraint[] | null {
  if (!Array.isArray(value) || value.length !== GRID_AXIS_SIZE) {
    return null;
  }

  const constraints: ApiConstraint[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      return null;
    }

    const constraint = entry as {
      category?: unknown;
      value?: unknown;
    };

    if (typeof constraint.category !== 'string' || typeof constraint.value !== 'string') {
      return null;
    }

    const normalizedCategory = constraint.category.trim();
    const normalizedValue = constraint.value.trim();
    if (!normalizedCategory || !normalizedValue) {
      return null;
    }

    const parsed = findConstraintOption(`${normalizedCategory}:${normalizedValue}`);
    if (!parsed || parsed.category !== normalizedCategory || parsed.value !== normalizedValue) {
      return null;
    }

    constraints.push({
      category: normalizedCategory,
      value: normalizedValue,
    });
  }

  return constraints;
}

export function parseAdminBonusPuzzleRequest(bodyText: string | undefined | null): AdminBonusPuzzleRequest | null {
  if (!bodyText) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const payload = parsed as {
    date?: unknown;
    rowConstraints?: unknown;
    colConstraints?: unknown;
  };

  if (typeof payload.date !== 'string' || !DATE_PATTERN.test(payload.date.trim())) {
    return null;
  }

  const rowConstraints = validateConstraintArray(payload.rowConstraints);
  const colConstraints = validateConstraintArray(payload.colConstraints);
  if (!rowConstraints || !colConstraints) {
    return null;
  }

  return {
    date: payload.date.trim(),
    rowConstraints,
    colConstraints,
  };
}

function toRuntimeConstraint(constraint: ApiConstraint): MappedPuzzle['rowConstraints'][number] {
  const runtimeCategory = CUSTOM_TO_RUNTIME_CATEGORY[constraint.category];
  if (!runtimeCategory) {
    throw new Error(`Unsupported constraint category: ${constraint.category}`);
  }

  return {
    category: runtimeCategory,
    value: constraint.value,
  };
}

export function createBonusPuzzle(payload: AdminBonusPuzzleRequest): MappedPuzzle {
  return {
    date: payload.date,
    type: 'BONUS',
    bonus: true,
    size: GRID_AXIS_SIZE * GRID_AXIS_SIZE,
    rowConstraints: payload.rowConstraints.map(toRuntimeConstraint),
    colConstraints: payload.colConstraints.map(toRuntimeConstraint),
  };
}

function getBonusPuzzleKey(date: string): string {
  return `${PUZZLES_PREFIX}${date}-bonus.json`;
}

function isRegularPuzzle(puzzle: MappedPuzzle): boolean {
  return puzzle.type !== 'BONUS' && puzzle.bonus !== true;
}

export function mergeTodayPuzzleBonus(
  currentFile: ReturnType<typeof parseTodayPuzzleFile>,
  bonusPuzzle: MappedPuzzle
): { nextFile: ReturnType<typeof createTodayPuzzleFile>; updatedTodayPuzzle: boolean } {
  const regularPuzzle = currentFile.puzzles.find(isRegularPuzzle) ?? currentFile.puzzles[0] ?? null;
  if (!regularPuzzle || regularPuzzle.date !== bonusPuzzle.date) {
    return {
      nextFile: currentFile,
      updatedTodayPuzzle: false,
    };
  }

  const retainedPuzzles = currentFile.puzzles.filter((puzzle) => isRegularPuzzle(puzzle));
  return {
    nextFile: createTodayPuzzleFile([...retainedPuzzles, bonusPuzzle], currentFile.yesterdayPuzzle),
    updatedTodayPuzzle: true,
  };
}

async function readTodayPuzzleFileFromS3(s3: S3Client, bucketName: string) {
  const response = await s3.send(new GetObjectCommand({ Bucket: bucketName, Key: TODAY_PUZZLE_KEY }));
  const body = await streamToString(response.Body);
  return parseTodayPuzzleFile(JSON.parse(body) as unknown);
}

async function invalidateTodayPuzzleCache(distributionId: string): Promise<void> {
  const cloudFront = new CloudFrontClient({});
  await cloudFront.send(
    new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: `today-puzzle-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        Paths: {
          Quantity: 1,
          Items: ['/data/runtime/today-puzzle.json'],
        },
      },
    })
  );
}

function validateRuntimeConfigured(): boolean {
  return Boolean(RUNTIME_BUCKET_NAME && TODAY_PUZZLE_KEY && POKEMON_DATA_KEY && PUZZLES_PREFIX);
}

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  const meta = requestMeta(event);
  logInfo('admin_bonus_puzzle_post_start', meta);

  try {
    const authResult = await authenticate(event);
    if ('statusCode' in authResult) {
      logInfo('admin_bonus_puzzle_post_auth_failed', meta);
      return authResult;
    }

    if (!authResult.isAdmin) {
      logInfo('admin_bonus_puzzle_post_forbidden', {
        ...meta,
        userIdHash: fingerprintUser(authResult.userId),
      });
      return forbidden(event, 'Admin access required.');
    }

    try {
      await touchUserActivity(authResult.userId);
    } catch (error) {
      logError('user_activity_touch_failed', {
        ...meta,
        userIdHash: fingerprintUser(authResult.userId),
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (!validateRuntimeConfigured()) {
      logError('admin_bonus_puzzle_post_misconfigured', meta);
      return internalError(event);
    }

    const payload = parseAdminBonusPuzzleRequest(event.body);
    if (!payload) {
      return badRequest(
        event,
        'Invalid payload. Expected date plus 3 rowConstraints and 3 colConstraints using valid custom puzzle constraint values.'
      );
    }

    const s3 = new S3Client({});
    const pokemon = await readPokemonListFromS3(s3, RUNTIME_BUCKET_NAME, POKEMON_DATA_KEY);
    const [bonusPuzzle] = enrichPuzzlesWithFeaturedPick([createBonusPuzzle(payload)], pokemon);
    const currentTodayPuzzleFile = await readTodayPuzzleFileFromS3(s3, RUNTIME_BUCKET_NAME);
    const { nextFile, updatedTodayPuzzle } = mergeTodayPuzzleBonus(currentTodayPuzzleFile, bonusPuzzle);

    await putJsonToS3(s3, RUNTIME_BUCKET_NAME, getBonusPuzzleKey(payload.date), bonusPuzzle);
    if (updatedTodayPuzzle) {
      await putJsonToS3(s3, RUNTIME_BUCKET_NAME, TODAY_PUZZLE_KEY, nextFile);

      if (CLOUDFRONT_DISTRIBUTION_ID) {
        await invalidateTodayPuzzleCache(CLOUDFRONT_DISTRIBUTION_ID);
      }
    }

    logInfo('admin_bonus_puzzle_post_success', {
      ...meta,
      userIdHash: fingerprintUser(authResult.userId),
      date: payload.date,
      updatedTodayPuzzle,
    });

    return ok(event, {
      date: payload.date,
      updatedTodayPuzzle,
    });
  } catch (error) {
    logError('admin_bonus_puzzle_post_error', {
      ...meta,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return internalError(event);
  }
}
