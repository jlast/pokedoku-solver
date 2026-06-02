import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';
import {
  authenticate,
  fingerprintUser,
  internalError,
  logError,
  logInfo,
  ok,
  requestMeta,
} from './public-api-shared';
import { touchUserActivity } from './user-activity-shared';
import { readUserDex, validateUserDexTableConfigured } from './user-dex-shared';

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  const meta = requestMeta(event);
  logInfo('user_dex_get_start', meta);

  try {
    const authResult = await authenticate(event);
    if ('statusCode' in authResult) {
      logInfo('user_dex_get_auth_failed', meta);
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

    if (!validateUserDexTableConfigured()) {
      logError('user_dex_get_misconfigured', meta);
      return internalError(event);
    }

    const userDex = await readUserDex(authResult.userId);
    logInfo('user_dex_get_success', {
      ...meta,
      userIdHash: fingerprintUser(authResult.userId),
      count: userDex.caughtPokemonKeyIds.length,
      shinyCount: userDex.shinyPokemonKeyIds.length,
      unlockedPrestigeLevelIndex: userDex.unlockedPrestigeLevelIndex,
    });

    return ok(event, userDex);
  } catch (error) {
    logError('user_dex_get_error', {
      ...meta,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return internalError(event);
  }
}
