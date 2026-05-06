import { Hono } from 'hono';
import type {
  OnAppInstallRequest,
  OnCommentCreateRequest,
  OnCommentSubmitRequest,
  OnPostCreateRequest,
  OnPostSubmitRequest,
  TriggerResponse,
} from '@devvit/web/shared';
import { reddit } from '@devvit/web/server';
import { isT1, isT3 } from '@devvit/shared-types/tid.js';

export const triggers = new Hono();

const BRACKET_TOKEN_REGEX = /\[\[([^\]]+)\]\]/g;

const POKEMON_DETAILS: Record<string, string> = {
  pikachu: 'Electric',
};


const extractBracketTokens = (input: string): string[] => {
  const matches = input.matchAll(BRACKET_TOKEN_REGEX);
  const tokens = new Set<string>();

  for (const match of matches) {
    const token = match[1]?.trim().toLowerCase();
    if (token) {
      tokens.add(token);
    }
  }

  return [...tokens];
};

const getResponseText = (input: string): string | null => {
  const tokens = extractBracketTokens(input);
  const responses = tokens
    .map((token) => POKEMON_DETAILS[token])
    .filter((value): value is string => Boolean(value));

  if (responses.length === 0) {
    return null;
  }

  return responses.join('\n');
};

triggers.post('/on-app-install', async (c) => {
  const input = await c.req.json<OnAppInstallRequest>();
  console.log('App installed to subreddit: r/' + input.subreddit?.name);

  return c.json<TriggerResponse>({}, 200);
});

const handleCommentEvent = async (
  input: OnCommentSubmitRequest | OnCommentCreateRequest
) => {
  const body = input.comment?.body ?? '';
  const commentId = input.comment?.id;

  if (!body || !commentId || !isT1(commentId)) {
    return;
  }

  const appUser = await reddit.getAppUser();
  const authorName = input.comment?.author;

  if (authorName && authorName === appUser?.username) {
    return;
  }

  const responseText = getResponseText(body);
  console.log(
    `on-comment-submit commentId=${commentId} matched=${responseText ? 'yes' : 'no'}`
  );

  if (!responseText) {
    return;
  }

  const comment = await reddit.getCommentById(commentId);
  await comment.reply({ text: responseText, runAs: 'APP' });
};

triggers.post('/on-comment-submit', async (c) => {
  const input = await c.req.json<OnCommentSubmitRequest>();
  await handleCommentEvent(input);

  return c.json<TriggerResponse>({}, 200);
});

triggers.post('/on-comment-create', async (c) => {
  const input = await c.req.json<OnCommentCreateRequest>();
  await handleCommentEvent(input);

  return c.json<TriggerResponse>({}, 200);
});

const handlePostEvent = async (
  input: OnPostSubmitRequest | OnPostCreateRequest
) => {
  const postId = input.post?.id;

  if (!postId || !isT3(postId)) {
    return;
  }

  const appUser = await reddit.getAppUser();
  const authorName = input.author?.name;

  if (authorName && authorName === appUser?.username) {
    return;
  }

  const postText = `${input.post?.title ?? ''}\n${input.post?.selftext ?? ''}`;
  const responseText = getResponseText(postText);
  console.log(
    `on-post-submit postId=${postId} matched=${responseText ? 'yes' : 'no'}`
  );

  if (!responseText) {
    return;
  }

  await reddit.submitComment({ id: postId, text: responseText, runAs: 'APP' });
};

triggers.post('/on-post-submit', async (c) => {
  const input = await c.req.json<OnPostSubmitRequest>();
  await handlePostEvent(input);

  return c.json<TriggerResponse>({}, 200);
});

triggers.post('/on-post-create', async (c) => {
  const input = await c.req.json<OnPostCreateRequest>();
  await handlePostEvent(input);

  return c.json<TriggerResponse>({}, 200);
});
