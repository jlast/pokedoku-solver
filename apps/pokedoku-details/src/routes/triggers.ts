import { Hono } from 'hono';
import {
  isT1,
  isT3,
  type OnAppInstallRequest,
  type OnCommentCreateRequest,
  type OnCommentSubmitRequest,
  type OnPostCreateRequest,
  type OnPostSubmitRequest,
  type T1,
  type TriggerResponse,
} from '@devvit/web/shared';
import { reddit, RichTextBuilder } from '@devvit/web/server';
import { FILTER_CATEGORIES } from '@pokedoku-helper/shared-types';
import type { Pokemon } from '@pokedoku-helper/shared-types';
import { makeFormatting } from '@devvit/shared-types/richtext/elements.js';
import { getPokemonMap } from '../core/pokemonCache';
import { log } from '../core/logger';
import {
  appendPokemonCompactLine,
  buildPokemonRedditRichText,
} from './pokemonCommentBuilder';
import {
  appendFilterCompactLine,
  appendFilterStats,
  formatTypeDifficultyStats,
  type MatchedFilter,
} from './categoryCommentBuilder';
import { error as logError, warn } from '../core/logger';

export const triggers = new Hono();

const PROCESSED_COMMENT_EVENT_TTL_MS = 2 * 60 * 1000;
const processedCommentEvents = new Map<string, number>();

const BRACKET_TOKEN_REGEX = /(?:\\\[\\\[|\[\[)(.+?)(?:\\\]\\\]|\]\])/g;


const extractBracketTokens = (input: string): string[] => {
  const matches = input.matchAll(BRACKET_TOKEN_REGEX);
  const tokens: string[] = [];

  for (const match of matches) {
    const token = match[1]?.trim().toLowerCase();
    if (token) {
      tokens.push(token);
    }
  }

  return tokens;
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

const shouldProcessCommentEvent = (commentId: T1): boolean => {
  const now = Date.now();

  for (const [id, seenAt] of processedCommentEvents.entries()) {
    if (now - seenAt > PROCESSED_COMMENT_EVENT_TTL_MS) {
      processedCommentEvents.delete(id);
    }
  }

  if (processedCommentEvents.has(commentId)) {
    return false;
  }

  processedCommentEvents.set(commentId, now);
  return true;
};

type MatchedLookup = {
  pokemon: Pokemon[];
  filters: MatchedFilter[];
  ordered: Array<{ kind: 'pokemon'; value: Pokemon } | { kind: 'filter'; value: MatchedFilter }>;
  tokenCount: number;
};

const getMatchedLookup = async (input: string): Promise<MatchedLookup> => {
  const tokens = extractBracketTokens(input);
  if (tokens.length === 0) {
    log('pokemon-match tokens=none');
    return { pokemon: [], filters: [], ordered: [], tokenCount: 0 };
  }

  const pokemonMap = await getPokemonMap();
  const pokemonList = Array.from(pokemonMap.values());
  const pokemonMatches: Pokemon[] = [];
  const filterMatches: MatchedFilter[] = [];
  const ordered: Array<{ kind: 'pokemon'; value: Pokemon } | { kind: 'filter'; value: MatchedFilter }> = [];
  const matchedTokens: string[] = [];
  const matchedFilterTokens: string[] = [];

  for (const token of tokens) {
    const pokemon = pokemonMap.get(token);
    if (pokemon) {
      pokemonMatches.push(pokemon);
      ordered.push({ kind: 'pokemon', value: pokemon });
      matchedTokens.push(token);
      continue;
    }

    if (token.includes('+')) {
      const [leftTokenRaw, rightTokenRaw] = token.split('+');
      const leftToken = leftTokenRaw?.trim();
      const rightToken = rightTokenRaw?.trim();

      if (!leftToken || !rightToken) {
        continue;
      }

      const leftCategory = FILTER_CATEGORIES.find((category) =>
        category.options.some((option) => option.name.toLowerCase() === leftToken)
      );
      const rightCategory = FILTER_CATEGORIES.find((category) =>
        category.options.some((option) => option.name.toLowerCase() === rightToken)
      );

      const leftOption = leftCategory?.options.find(
        (option) => option.name.toLowerCase() === leftToken
      );
      const rightOption = rightCategory?.options.find(
        (option) => option.name.toLowerCase() === rightToken
      );

      if (!leftCategory || !rightCategory || !leftOption || !rightOption) {
        continue;
      }

      const matchedPokemonForFilter = pokemonList.filter(
        (entry) => leftOption.matches(entry) && rightOption.matches(entry)
      );
      const hasTypeFilter =
        leftCategory.key === 'types' || rightCategory.key === 'types';
      const difficultyStats = hasTypeFilter
        ? formatTypeDifficultyStats(matchedPokemonForFilter)
        : null;

      const filterMatch: MatchedFilter = {
        categoryLabel: `${leftCategory.label} + ${rightCategory.label}`,
        name: `${leftOption.name} + ${rightOption.name}`,
        linkSlug: `${leftOption.name}/${rightOption.name}`,
        count: matchedPokemonForFilter.length,
      };

      if (difficultyStats?.distribution) {
        filterMatch.difficultyDistribution = difficultyStats.distribution;
      }

      filterMatches.push(filterMatch);
      ordered.push({ kind: 'filter', value: filterMatch });
      matchedFilterTokens.push(token);
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
      linkSlug: filterOption.name,
      count: matchedPokemonForFilter.length,
      difficultyDistribution: difficultyStats.distribution,
    };

    filterMatches.push(filterMatch);
    ordered.push({ kind: 'filter', value: filterMatch });
    matchedFilterTokens.push(token);
  }

  log(
    `pokemon-match tokens=${tokens.join(',')} pokemon=${matchedTokens.join(',') || 'none'} filters=${matchedFilterTokens.join(',') || 'none'}`
  );

  return {
    pokemon: pokemonMatches,
    filters: filterMatches,
    ordered,
    tokenCount: tokens.length,
  };
};

export const __test__ = {
  extractBracketTokens,
  getMatchedLookup,
};

const renderPokemonReplyText = ({ ordered, tokenCount }: MatchedLookup): RichTextBuilder => {
  const builder = new RichTextBuilder();
  const compactMode = tokenCount >= 6;

  if (compactMode) {
    builder.paragraph((p) => {
      ordered.forEach((entry) => {
        if (entry.kind === 'pokemon') {
          appendPokemonCompactLine(p, entry.value);
        } else {
          appendFilterCompactLine(p, entry.value);
        }
        p.linebreak();
      });
    });

    return builder;
  }

  ordered.forEach((entry, index) => {
    if (index > 0) {
     builder.paragraph((p) => {p.linebreak(); p.linebreak()} );
    }
    if (entry.kind === 'pokemon') {
      buildPokemonRedditRichText(builder, entry.value);
    } else {
      appendFilterStats(builder, entry.value);
    }
  });

  builder.paragraph((p) => p.linebreak());
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
  log('App installed to subreddit: r/' + input.subreddit?.name);

  return c.json<TriggerResponse>({}, 200);
});

const handleCommentEvent = async (
  input: OnCommentSubmitRequest | OnCommentCreateRequest
) => {
  const body = input.comment?.body ?? '';
  const rawCommentId = input.comment?.id;
  const commentId = normalizeCommentId(rawCommentId);

  if (!body || !commentId) {
    log(
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
  log(
    `on-comment commentId=${commentId} rawCommentId=${rawCommentId} matched=${hasMatch ? 'yes' : 'no'}`
  );
  if (!hasMatch) {
    log(`on-comment body=${JSON.stringify(body)}`);
  }

  if (!hasMatch) {
    return;
  }

  if (!shouldProcessCommentEvent(commentId)) {
    warn(`duplicate comment event skipped commentId=${commentId}`);
    return;
  }

  try {
    const comment = await reddit.getCommentById(commentId);
    const textBuilder = renderPokemonReplyText(lookup);
    await comment.reply({
      richtext: textBuilder,
      runAs: 'APP',
    });
  } catch (replyError) {
    logError(`comment reply failed commentId=${commentId}`, replyError);
  }
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
  log(
    `on-post-submit postId=${postId} matched=${hasMatch ? 'yes' : 'no'}`
  );

  if (!hasMatch) {
    return;
  }

  try {
    const textBuilder = renderPokemonReplyText(lookup);
    await reddit.submitComment({
      id: postId,
      richtext: textBuilder,
      runAs: 'APP',
    });
  } catch (replyError) {
    logError(`post reply failed postId=${postId}`, replyError);
  }
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
