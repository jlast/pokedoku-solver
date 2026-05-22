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
import { readSettings, validateSettingsTableConfigured } from './settings-shared';

export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> {
  const meta = requestMeta(event);
  logInfo('settings_get_start', meta);

  try {
    const authResult = await authenticate(event);
    if ('statusCode' in authResult) {
      logInfo('settings_get_auth_failed', meta);
      return authResult;
    }

    if (!validateSettingsTableConfigured()) {
      logError('settings_get_misconfigured', meta);
      return internalError(event);
    }

    const settings = await readSettings(authResult.userId);
    logInfo('settings_get_success', {
      ...meta,
      userIdHash: fingerprintUser(authResult.userId),
    });

    return ok(event, settings);
  } catch (error) {
    logError('settings_get_error', {
      ...meta,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return internalError(event);
  }
}
