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
  notFound,
  ok,
  requestMeta,
} from './public-api-shared';
import { touchUserActivity } from './user-activity-shared';
import { readUserPuzzle, validatePuzzleKey, validateUserPuzzleHistoryTableConfigured } from './user-puzzle-history-shared';

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  const meta = requestMeta(event);
  logInfo('user_puzzle_get_start', meta);

  try {
    const authResult = await authenticate(event);
    if ('statusCode' in authResult) {
      logInfo('user_puzzle_get_auth_failed', meta);
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
      logError('user_puzzle_get_misconfigured', meta);
      return internalError(event);
    }

    const puzzleKey = validatePuzzleKey(event.pathParameters?.puzzleKey);
    if (!puzzleKey) {
      logInfo('user_puzzle_get_invalid_key', meta);
      return badRequest(event, 'Invalid puzzle key.');
    }

    const puzzle = await readUserPuzzle(authResult.userId, puzzleKey);
    if (!puzzle) return notFound(event, 'Puzzle not found.');

    logInfo('user_puzzle_get_success', {
      ...meta,
      userIdHash: fingerprintUser(authResult.userId),
      puzzleKey,
      count: puzzle.answers.length,
    });

    return ok(event, puzzle);
  } catch (error) {
    logError('user_puzzle_get_error', {
      ...meta,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return internalError(event);
  }
}
