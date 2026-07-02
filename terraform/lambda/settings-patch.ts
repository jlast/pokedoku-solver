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
  mergeSettings,
  readSettings,
  validatePartialSettingsPayload,
  validateSettingsTableConfigured,
  writeSettings,
} from './settings-shared';
import { touchUserActivity } from './user-activity-shared';

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  const meta = requestMeta(event);
  logInfo('settings_patch_start', meta);

  try {
    const authResult = await authenticate(event);
    if ('statusCode' in authResult) {
      logInfo('settings_patch_auth_failed', meta);
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

    if (!validateSettingsTableConfigured()) {
      logError('settings_patch_misconfigured', meta);
      return internalError(event);
    }

    const patch = validatePartialSettingsPayload(event.body);
    if (!patch) {
      logInfo('settings_patch_validation_failed', meta);
      return badRequest(
        event,
        'Invalid payload. Expected non-empty partial object with keys: preventSpoilerMode, myPokedexFilter, displayName, collapsePokedexAnswerFilters. isAdmin is read-only.'
      );
    }

    const current = await readSettings(authResult.userId);
    const next = mergeSettings(current, patch);
    await writeSettings(authResult.userId, next);

    logInfo('settings_patch_success', {
      ...meta,
      userIdHash: fingerprintUser(authResult.userId),
      changedKeys: Object.keys(patch),
    });

    return ok(event, {
      ...next,
      isAdmin: authResult.isAdmin,
    });
  } catch (error) {
    logError('settings_patch_error', {
      ...meta,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return internalError(event);
  }
}
