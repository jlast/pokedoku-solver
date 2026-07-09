import { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const TABLE_NAME = process.env.USER_PUZZLE_HISTORY_TABLE_NAME ?? '';
const dynamo = new DynamoDBClient({});

export type UserPuzzleAnswer = {
  row: number;
  col: number;
  pokemonKeyId: number;
};

export type UserPuzzle = {
  puzzleKey: string;
  answers: UserPuzzleAnswer[];
  completedAt: string | null;
  updatedAt: string | null;
};

function sanitizePuzzleKey(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}(-bonus)?$/.test(trimmed)) return null;
  return trimmed;
}

function sanitizeTimestamp(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (value.trim().length === 0 || Number.isNaN(Date.parse(value))) return null;
  return value;
}

function sanitizeAnswer(value: unknown): UserPuzzleAnswer | null {
  if (!value || typeof value !== 'object') return null;
  const payload = value as {
    row?: unknown;
    col?: unknown;
    pokemonKeyId?: unknown;
  };

  const row = Number(payload.row);
  const col = Number(payload.col);
  const pokemonKeyId = Number(payload.pokemonKeyId);
  if (!Number.isInteger(row) || row < 0 || row > 8) return null;
  if (!Number.isInteger(col) || col < 0 || col > 8) return null;
  if (!Number.isInteger(pokemonKeyId) || pokemonKeyId <= 0) return null;

  return { row, col, pokemonKeyId };
}

function sanitizeAnswers(value: unknown): UserPuzzleAnswer[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length > 81) return null;

  const byCell = new Map<string, UserPuzzleAnswer>();
  for (const entry of value) {
    const answer = sanitizeAnswer(entry);
    if (!answer) return null;
    byCell.set(`${answer.row}-${answer.col}`, answer);
  }

  return Array.from(byCell.values()).sort((a, b) => a.row - b.row || a.col - b.col);
}

function sanitizeUserPuzzleItem(value: unknown): UserPuzzle | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as {
    puzzleKey?: unknown;
    answers?: unknown;
    completedAt?: unknown;
    updatedAt?: unknown;
  };

  const puzzleKey = sanitizePuzzleKey(item.puzzleKey);
  const answers = sanitizeAnswers(item.answers);
  if (!puzzleKey || !answers) return null;

  return {
    puzzleKey,
    answers,
    completedAt: sanitizeTimestamp(item.completedAt),
    updatedAt: sanitizeTimestamp(item.updatedAt),
  };
}

export function validateUserPuzzleHistoryTableConfigured(): boolean {
  return TABLE_NAME.length > 0;
}

export function validatePuzzleKey(value: unknown): string | null {
  return sanitizePuzzleKey(value);
}

export function validateUserPuzzlePayload(
  bodyText: string | undefined | null
): { answers: UserPuzzleAnswer[]; completedAt: string | null } | null {
  if (!bodyText) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const payload = parsed as {
    answers?: unknown;
    completedAt?: unknown;
  };

  const answers = sanitizeAnswers(payload.answers);
  if (!answers) return null;

  const completedAt = payload.completedAt === null || payload.completedAt === undefined
    ? null
    : sanitizeTimestamp(payload.completedAt);
  if (payload.completedAt !== null && payload.completedAt !== undefined && !completedAt) return null;

  return { answers, completedAt };
}

export async function readUserPuzzle(userId: string, puzzleKey: string): Promise<UserPuzzle | null> {
  const result = await dynamo.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({ userId, puzzleKey }),
      ConsistentRead: true,
    })
  );

  if (!result.Item) return null;
  return sanitizeUserPuzzleItem(unmarshall(result.Item));
}

export async function readUserPuzzles(userId: string): Promise<UserPuzzle[]> {
  const result = await dynamo.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: marshall({ ':userId': userId }),
      ScanIndexForward: false,
    })
  );

  return (result.Items ?? [])
    .map((item) => sanitizeUserPuzzleItem(unmarshall(item)))
    .filter((item): item is UserPuzzle => Boolean(item));
}

export async function writeUserPuzzle(
  userId: string,
  puzzleKey: string,
  answers: UserPuzzleAnswer[],
  completedAt: string | null
): Promise<UserPuzzle> {
  const updatedAt = new Date().toISOString();
  const item = {
    userId,
    puzzleKey,
    answers,
    completedAt,
    updatedAt,
  };

  await dynamo.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: marshall(item, { removeUndefinedValues: true }),
    })
  );

  return {
    puzzleKey,
    answers,
    completedAt,
    updatedAt,
  };
}
