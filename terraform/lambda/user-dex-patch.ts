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

    const payload = validateUserDexPayload(event.body);
    if (!payload) {
      logInfo('user_dex_patch_validation_failed', meta);
      return badRequest(event, 'Invalid payload. Expected { "caughtPokemonKeyIds": number[], "shinyPokemonKeyIds"?: number[] }.');
    }

    await writeUserDex(authResult.userId, payload.caughtPokemonKeyIds, payload.shinyPokemonKeyIds);
    logInfo('user_dex_patch_success', {
      ...meta,
      userIdHash: fingerprintUser(authResult.userId),
      count: payload.caughtPokemonKeyIds.length,
      shinyCount: payload.shinyPokemonKeyIds.length,
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
