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
import type { T1 } from '@devvit/shared-types/tid.js';
import { getPokemonMap } from '../core/pokemonCache';

export const triggers = new Hono();

const BRACKET_TOKEN_REGEX = /(?:\\\[\\\[|\[\[)(.+?)(?:\\\]\\\]|\]\])/g;

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

const normalizeCommentId = (id: string | undefined): T1 | null => {
  if (!id) {
    return null;
  }

  if (isT1(id)) {
    return id;
  }

  const prefixed = `t1_${id}`;
  if (isT1(prefixed)) {
    return prefixed;
  }

  return null;
};

const getPokemonResponseText = async (input: string): Promise<string | null> => {
  const tokens = extractBracketTokens(input);
  if (tokens.length === 0) {
    console.log('pokemon-match tokens=none');
    return null;
  }

  const pokemonMap = await getPokemonMap();
  const responses: string[] = [];
  const matchedTokens: string[] = [];
  for (const token of tokens) {
    const type = pokemonMap.get(token)?.types[0];
    if (type) {
      responses.push(type);
      matchedTokens.push(token);
    }
  }

  console.log(
    `pokemon-match tokens=${tokens.join(',')} matched=${matchedTokens.join(',') || 'none'}`
  );

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
  const rawCommentId = input.comment?.id;
  const commentId = normalizeCommentId(rawCommentId);

  if (!body || !commentId) {
    console.log(
      `on-comment skipped body=${body ? 'yes' : 'no'} rawCommentId=${rawCommentId ?? 'missing'}`
    );
    return;
  }

  const appUser = await reddit.getAppUser();
  const authorName = input.comment?.author;

  if (authorName && authorName === appUser?.username) {
    return;
  }

  const responseText = await getPokemonResponseText(body);
  console.log(
    `on-comment commentId=${commentId} rawCommentId=${rawCommentId} matched=${responseText ? 'yes' : 'no'}`
  );
  if (!responseText) {
    console.log(`on-comment body=${JSON.stringify(body)}`);
  }

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
  const responseText = await getPokemonResponseText(postText);
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
