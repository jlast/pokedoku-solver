import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const SETTINGS_TABLE_NAME = process.env.SETTINGS_TABLE_NAME ?? '';
const dynamo = new DynamoDBClient({});

export type SettingsPayload = {
  preventSpoilerMode: boolean;
  myPokedexFilter: boolean;
  displayName: string;
};

const DEFAULT_SETTINGS: SettingsPayload = {
  preventSpoilerMode: false,
  myPokedexFilter: true,
  displayName: '',
};

function sanitizeDisplayName(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 40);
}

function sanitizeSettingsFromItem(value: unknown): SettingsPayload {
  if (!value || typeof value !== 'object') return DEFAULT_SETTINGS;
  const payload = value as {
    preventSpoilerMode?: unknown;
    myPokedexFilter?: unknown;
    displayName?: unknown;
  };

  return {
    preventSpoilerMode: payload.preventSpoilerMode === true,
    myPokedexFilter: payload.myPokedexFilter === true,
    displayName: sanitizeDisplayName(payload.displayName),
  };
}

export function validateSettingsTableConfigured(): boolean {
  return SETTINGS_TABLE_NAME.length > 0;
}

export async function readSettings(userId: string): Promise<SettingsPayload> {
  const result = await dynamo.send(
    new GetItemCommand({
      TableName: SETTINGS_TABLE_NAME,
      Key: marshall({ userId }),
      ConsistentRead: true,
    })
  );

  if (!result.Item) return DEFAULT_SETTINGS;
  const item = unmarshall(result.Item) as {
    preventSpoilerMode?: unknown;
    myPokedexFilter?: unknown;
    displayName?: unknown;
  };

  return sanitizeSettingsFromItem(item);
}

export async function writeSettings(userId: string, settings: SettingsPayload): Promise<void> {
  await dynamo.send(
    new PutItemCommand({
      TableName: SETTINGS_TABLE_NAME,
      Item: marshall({
        userId,
        preventSpoilerMode: settings.preventSpoilerMode,
        myPokedexFilter: settings.myPokedexFilter,
        displayName: settings.displayName,
        updatedAt: new Date().toISOString(),
      }),
    })
  );
}

export function validatePartialSettingsPayload(bodyText: string | undefined | null): Partial<SettingsPayload> | null {
  if (!bodyText) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const payload = parsed as Record<string, unknown>;
  const allowedKeys = new Set(['preventSpoilerMode', 'myPokedexFilter', 'displayName']);

  const keys = Object.keys(payload);
  if (keys.length === 0) return null;
  if (keys.some((key) => !allowedKeys.has(key))) return null;

  const next: Partial<SettingsPayload> = {};

  if ('preventSpoilerMode' in payload) {
    if (typeof payload.preventSpoilerMode !== 'boolean') return null;
    next.preventSpoilerMode = payload.preventSpoilerMode;
  }

  if ('myPokedexFilter' in payload) {
    if (typeof payload.myPokedexFilter !== 'boolean') return null;
    next.myPokedexFilter = payload.myPokedexFilter;
  }

  if ('displayName' in payload) {
    if (typeof payload.displayName !== 'string') return null;
    if (payload.displayName.trim().length > 40) return null;
    next.displayName = payload.displayName.trim();
  }

  return next;
}

export function mergeSettings(current: SettingsPayload, patch: Partial<SettingsPayload>): SettingsPayload {
  return {
    preventSpoilerMode: patch.preventSpoilerMode ?? current.preventSpoilerMode,
    myPokedexFilter: patch.myPokedexFilter ?? current.myPokedexFilter,
    displayName: patch.displayName ?? current.displayName,
  };
}
