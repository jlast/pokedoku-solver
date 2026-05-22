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
import {
  validateUserDexTableConfigured,
  validateUserDexPayload,
  writeUserDex,
} from './user-dex-shared';

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  const meta = requestMeta(event);
  logInfo('user_dex_patch_start', meta);

  try {
    const authResult = await authenticate(event);
    if ('statusCode' in authResult) {
      logInfo('user_dex_patch_auth_failed', meta);
      return authResult;
    }

    if (!validateUserDexTableConfigured()) {
      logError('user_dex_patch_misconfigured', meta);
      return internalError(event);
    }

    const payload = validateUserDexPayload(event.body);
    if (!payload) {
      logInfo('user_dex_patch_validation_failed', meta);
      return badRequest(event, 'Invalid payload. Expected { "caughtPokemonKeyIds": number[], "shinyPokemonKeyIds"?: number[], "unlockedPrestigeLevelIndex"?: number }.');
    }

    await writeUserDex(
      authResult.userId,
      payload.caughtPokemonKeyIds,
      payload.shinyPokemonKeyIds,
      payload.unlockedPrestigeLevelIndex
    );
    logInfo('user_dex_patch_success', {
      ...meta,
      userIdHash: fingerprintUser(authResult.userId),
      count: payload.caughtPokemonKeyIds.length,
      shinyCount: payload.shinyPokemonKeyIds.length,
      unlockedPrestigeLevelIndex: payload.unlockedPrestigeLevelIndex,
    });

    return ok(event, payload);
  } catch (error) {
    logError('user_dex_patch_error', {
      ...meta,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return internalError(event);
  }
}
