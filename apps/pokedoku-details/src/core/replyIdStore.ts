import { redis } from '@devvit/web/server';
import type { T1 } from '@devvit/web/shared';

export const getReplyMapKey = (sourceId: string): string => `reply-map:${sourceId}`;

export const storeCreatedCommentForSourceId = async (
  sourceId: string,
  createdCommentId: T1
): Promise<string> => {
  const key = getReplyMapKey(sourceId);
  await redis.set(key, createdCommentId);
  return key;
};

export const getCreatedCommentForSourceId = async (
  sourceId: string
): Promise<string | null> => {
  const key = getReplyMapKey(sourceId);
  const value = await redis.get(key);
  return value ?? null;
};
