import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';
import {
  authenticate,
  badRequest,
  fingerprintUser,
  internalError,
  logError,
  logInfo,
  ok,
  requestMeta,
} from './public-api-shared';
import { touchUserActivity } from './user-activity-shared';
import {
  readUserPuzzle,
  validatePuzzleKey,
  validateUserPuzzleHistoryTableConfigured,
  validateUserPuzzlePayload,
  writeUserPuzzle,
} from './user-puzzle-history-shared';

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  const meta = requestMeta(event);
  logInfo('user_puzzle_put_start', meta);

  try {
    const authResult = await authenticate(event);
    if ('statusCode' in authResult) {
      logInfo('user_puzzle_put_auth_failed', meta);
      return authResult;
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

    if (!validateUserPuzzleHistoryTableConfigured()) {
      logError('user_puzzle_put_misconfigured', meta);
      return internalError(event);
    }

    const puzzleKey = validatePuzzleKey(event.pathParameters?.puzzleKey);
    if (!puzzleKey) {
      logInfo('user_puzzle_put_invalid_key', meta);
      return badRequest(event, 'Invalid puzzle key.');
    }

    const payload = validateUserPuzzlePayload(event.body);
    if (!payload) {
      logInfo('user_puzzle_put_validation_failed', meta);
      return badRequest(event, 'Invalid payload. Expected { "answers": { "row": number, "col": number, "pokemonKeyId": number }[], "completedAt"?: string | null }.');
    }

    const existingPuzzle = await readUserPuzzle(authResult.userId, puzzleKey);
    const completedAt = existingPuzzle?.completedAt ?? payload.completedAt;
    const puzzle = await writeUserPuzzle(authResult.userId, puzzleKey, payload.answers, completedAt);
    logInfo('user_puzzle_put_success', {
      ...meta,
      userIdHash: fingerprintUser(authResult.userId),
      puzzleKey,
      count: payload.answers.length,
      completed: Boolean(completedAt),
    });

    return ok(event, puzzle);
  } catch (error) {
    logError('user_puzzle_put_error', {
      ...meta,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return internalError(event);
  }
}
