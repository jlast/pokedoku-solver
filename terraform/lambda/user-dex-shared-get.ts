import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';
import {
  fingerprintUser,
  internalError,
  logError,
  logInfo,
  notFound,
  ok,
  requestMeta,
} from './public-api-shared';
import { readSettings, validateSettingsTableConfigured } from './settings-shared';
import { readUserDexByUserId, validateUserDexTableConfigured } from './user-dex-shared';

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  const meta = requestMeta(event);
  const userId = event.pathParameters?.userId?.trim() ?? '';
  logInfo('user_dex_shared_get_start', { ...meta, hasUserId: userId.length > 0 });

  try {
    if (!userId) {
      return notFound(event, 'Pokedex not found.');
    }

    if (!validateUserDexTableConfigured() || !validateSettingsTableConfigured()) {
      logError('user_dex_shared_get_misconfigured', meta);
      return internalError(event);
    }

    const userDex = await readUserDexByUserId(userId);
    if (!userDex) {
      logInfo('user_dex_shared_get_not_found', {
        ...meta,
        userIdHash: fingerprintUser(userId),
      });
      return notFound(event, 'Pokedex not found.');
    }

    const settings = await readSettings(userId);
    const payload = {
      userId,
      displayName: settings.displayName,
      caughtPokemonKeyIds: userDex.caughtPokemonKeyIds,
      shinyPokemonKeyIds: userDex.shinyPokemonKeyIds,
      unlockedPrestigeLevelIndex: userDex.unlockedPrestigeLevelIndex,
      updatedAt: userDex.updatedAt,
    };

    logInfo('user_dex_shared_get_success', {
      ...meta,
      userIdHash: fingerprintUser(userId),
      count: userDex.caughtPokemonKeyIds.length,
      shinyCount: userDex.shinyPokemonKeyIds.length,
      unlockedPrestigeLevelIndex: userDex.unlockedPrestigeLevelIndex,
    });

    return ok(event, payload);
  } catch (error) {
    logError('user_dex_shared_get_error', {
      ...meta,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return internalError(event);
  }
}
