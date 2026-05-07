import { Hono } from 'hono';
import type {
  OnAppInstallRequest,
  OnCommentCreateRequest,
  OnCommentSubmitRequest,
  OnPostCreateRequest,
  OnPostSubmitRequest,
  TriggerResponse,
} from '@devvit/web/shared';
import { reddit, RichTextBuilder } from '@devvit/web/server';
import { isT1, isT3 } from '@devvit/shared-types/tid.js';
import type { T1 } from '@devvit/shared-types/tid.js';
import { FILTER_CATEGORIES } from '@pokedoku-helper/shared-types';
import type { Pokemon } from '@pokedoku-helper/shared-types';
import { makeFormatting } from '@devvit/shared-types/richtext/elements.js';
import { getPokemonMap } from '../core/pokemonCache';
import { buildPokemonRedditRichText } from './pokemonCommentBuilder';
import {
  appendFilterStats,
  formatTypeDifficultyStats,
  type MatchedFilter,
} from './categoryCommentBuilder';

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

type MatchedLookup = {
  pokemon: Pokemon[];
  filters: MatchedFilter[];
};

const getMatchedLookup = async (input: string): Promise<MatchedLookup> => {
  const tokens = extractBracketTokens(input);
  if (tokens.length === 0) {
    console.log('pokemon-match tokens=none');
    return { pokemon: [], filters: [] };
  }

  const pokemonMap = await getPokemonMap();
  const pokemonList = Array.from(pokemonMap.values());
  const pokemonMatches: Pokemon[] = [];
  const filterMatches: MatchedFilter[] = [];
  const matchedTokens: string[] = [];
  const matchedFilterTokens: string[] = [];

  for (const token of tokens) {
    const pokemon = pokemonMap.get(token);
    if (pokemon) {
      pokemonMatches.push(pokemon);
      matchedTokens.push(token);
      continue;
    }

    const filterCategory = FILTER_CATEGORIES.find((category) =>
      category.options.some((option) => option.name.toLowerCase() === token)
    );

    const filterOption = filterCategory?.options.find(
      (option) => option.name.toLowerCase() === token
    );

    if (!filterCategory || !filterOption) {
      continue;
    }

    const matchedPokemonForFilter = pokemonList.filter(filterOption.matches);
    const difficultyStats = formatTypeDifficultyStats(matchedPokemonForFilter);

    const filterMatch: MatchedFilter = {
      categoryLabel: filterCategory.label,
      name: filterOption.name,
      count: matchedPokemonForFilter.length,
      difficultyDistribution: difficultyStats.distribution,
      averageDifficulty: difficultyStats.averageDifficulty
    };

    filterMatches.push(filterMatch);
    matchedFilterTokens.push(token);
  }

  console.log(
    `pokemon-match tokens=${tokens.join(',')} pokemon=${matchedTokens.join(',') || 'none'} filters=${matchedFilterTokens.join(',') || 'none'}`
  );

  return { pokemon: pokemonMatches, filters: filterMatches };
};

const renderPokemonReplyText = ({ pokemon, filters }: MatchedLookup): RichTextBuilder => {
  const builder = new RichTextBuilder();
  pokemon.forEach((entry, index) => {
    if (index > 0) {
      builder.horizontalRule();
    }
    buildPokemonRedditRichText(builder, entry);
  });

  if (filters.length > 0 && pokemon.length > 0) {
    builder.horizontalRule();
  }
  filters.forEach((filter, index) => {
    if (index > 0) {
      builder.horizontalRule();
    }
    appendFilterStats(builder, filter);
  });

  builder.horizontalRule();
  builder.paragraph((p) => {
    const prefix = 'Data from ';
    const domain = 'pokedoku-helper.com';
    const suffix = '. Use [[Pokemon]] or [[Category]] or [[Category+Category]] to call.';

    p.text({
      text: prefix,
      formatting: [
        makeFormatting({ superscript: true, startIndex: 0, length: prefix.length }),
      ],
    });
    p.link({
      text: domain,
      url: 'https://pokedoku-helper.com',
      formatting: [
        makeFormatting({ superscript: true, startIndex: 0, length: domain.length }),
      ],
    });
    p.text({
      text: suffix,
      formatting: [
        makeFormatting({ superscript: true, startIndex: 0, length: suffix.length }),
      ],
    });
  });
  return builder;
}

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

  const lookup = await getMatchedLookup(body);
  const hasMatch = lookup.pokemon.length > 0 || lookup.filters.length > 0;
  console.log(
    `on-comment commentId=${commentId} rawCommentId=${rawCommentId} matched=${hasMatch ? 'yes' : 'no'}`
  );
  if (!hasMatch) {
    console.log(`on-comment body=${JSON.stringify(body)}`);
  }

  if (!hasMatch) {
    return;
  }

  const comment = await reddit.getCommentById(commentId);
  const textBuilder = renderPokemonReplyText(lookup);
  await comment.reply({
    richtext: textBuilder,
    runAs: 'APP',
  });
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
  const lookup = await getMatchedLookup(postText);
  const hasMatch = lookup.pokemon.length > 0 || lookup.filters.length > 0;
  console.log(
    `on-post-submit postId=${postId} matched=${hasMatch ? 'yes' : 'no'}`
  );

  if (!hasMatch) {
    return;
  }

  const textBuilder = renderPokemonReplyText(lookup);
  await reddit.submitComment({
    id: postId,
    richtext: textBuilder,
    runAs: 'APP',
  });
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
