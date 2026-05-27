import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const TABLE_NAME = process.env.USER_DEX_TABLE_NAME ?? '';
const dynamo = new DynamoDBClient({});

function sanitizeIdArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((entry) => Number(entry))
        .filter((entry) => Number.isInteger(entry) && entry > 0)
    )
  ).sort((a, b) => a - b);
}

function sanitizePrestigeLevel(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return 0;
  return parsed;
}

export function validateUserDexTableConfigured(): boolean {
  return TABLE_NAME.length > 0;
}

function sanitizeUpdatedAt(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (value.trim().length === 0 || Number.isNaN(Date.parse(value))) return null;
  return value;
}

export async function readUserDexByUserId(
  userId: string
): Promise<{
  caughtPokemonKeyIds: number[];
  shinyPokemonKeyIds: number[];
  unlockedPrestigeLevelIndex: number;
  updatedAt: string | null;
} | null> {
  const result = await dynamo.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({ userId }),
      ConsistentRead: true,
    })
  );

  if (!result.Item) return null;
  const item = unmarshall(result.Item) as {
    caughtPokemonKeyIds?: unknown;
    shinyPokemonKeyIds?: unknown;
    unlockedPrestigeLevelIndex?: unknown;
    updatedAt?: unknown;
  };

  const caughtPokemonKeyIds = sanitizeIdArray(item.caughtPokemonKeyIds);
  const caughtSet = new Set(caughtPokemonKeyIds);
  const shinyPokemonKeyIds = sanitizeIdArray(item.shinyPokemonKeyIds).filter((entry) => caughtSet.has(entry));

  const unlockedPrestigeLevelIndex = sanitizePrestigeLevel(item.unlockedPrestigeLevelIndex);
  const updatedAt = sanitizeUpdatedAt(item.updatedAt);
  return { caughtPokemonKeyIds, shinyPokemonKeyIds, unlockedPrestigeLevelIndex, updatedAt };
}

export async function readUserDex(
  userId: string
): Promise<{
  caughtPokemonKeyIds: number[];
  shinyPokemonKeyIds: number[];
  unlockedPrestigeLevelIndex: number;
  updatedAt: string | null;
}> {
  const userDex = await readUserDexByUserId(userId);
  if (!userDex) {
    return {
      caughtPokemonKeyIds: [],
      shinyPokemonKeyIds: [],
      unlockedPrestigeLevelIndex: 0,
      updatedAt: null,
    };
  }
  return userDex;
}

export async function writeUserDex(
  userId: string,
  caughtPokemonKeyIds: number[],
  shinyPokemonKeyIds: number[],
  unlockedPrestigeLevelIndex: number
): Promise<void> {
  await dynamo.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: marshall({
        userId,
        caughtPokemonKeyIds,
        shinyPokemonKeyIds,
        unlockedPrestigeLevelIndex,
        updatedAt: new Date().toISOString(),
      }),
    })
  );
}

export function validateUserDexPayload(
  bodyText: string | undefined | null
): { caughtPokemonKeyIds: number[]; shinyPokemonKeyIds: number[]; unlockedPrestigeLevelIndex: number } | null {
  if (!bodyText) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const payload = parsed as {
    caughtPokemonKeyIds?: unknown;
    shinyPokemonKeyIds?: unknown;
    unlockedPrestigeLevelIndex?: unknown;
  };

  if (!Array.isArray(payload.caughtPokemonKeyIds)) return null;

  const caughtPokemonKeyIds = sanitizeIdArray(payload.caughtPokemonKeyIds);
  if (caughtPokemonKeyIds.length > 5000) return null;

  const caughtSet = new Set(caughtPokemonKeyIds);
  const shinyPokemonKeyIds = sanitizeIdArray(payload.shinyPokemonKeyIds).filter((entry) => caughtSet.has(entry));
  if (shinyPokemonKeyIds.length > 5000) return null;

  const unlockedPrestigeLevelIndex = sanitizePrestigeLevel(payload.unlockedPrestigeLevelIndex);

  return {
    caughtPokemonKeyIds,
    shinyPokemonKeyIds,
    unlockedPrestigeLevelIndex,
  };
}
