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
import { richTextSuperscript } from './richTextFormatting';
import { error as logError, warn } from '../core/logger';
import {
  getCreatedCommentForSourceId,
  storeCreatedCommentForSourceId,
} from '../core/replyIdStore';

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

const normalizeCreatedCommentId = (id: string | undefined): T1 | null => {
  if (!id) {
    return null;
  }

  if (isT1(id)) {
    return id;
  }

  const prefixed = `t1_${id}`;
  return isT1(prefixed) ? prefixed : null;
};

type SourceEvent = {
  sourceId: string;
  sourceText: string;
  authorName: string | undefined;
  eventLabel: 'comment' | 'post';
  createReply: (textBuilder: RichTextBuilder) => Promise<{ id?: string } | undefined>;
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

const getFooterParagraph = (builder: RichTextBuilder) => {
  builder.horizontalRule();
  builder.paragraph((p) => {
    const prefix = 'Data from ';
    const domain = 'pokedoku-helper.com';
    const suffix = '. Use [[Pokemon]] or [[Category]] or [[Category+Category]] to call.';

    p.text({
      text: prefix,
      formatting: [richTextSuperscript(prefix.length)],
    });
    p.link({
      text: domain,
      url: 'https://pokedoku-helper.com',
      formatting: [richTextSuperscript(domain.length)],
    });
    p.text({
      text: suffix,
      formatting: [richTextSuperscript(suffix.length)],
    });
  });
}

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
    getFooterParagraph(builder);

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
  getFooterParagraph(builder);
  return builder;
}

triggers.post('/on-app-install', async (c) => {
  const input = await c.req.json<OnAppInstallRequest>();
  log('App installed to subreddit: r/' + input.subreddit?.name);

  return c.json<TriggerResponse>({}, 200);
});

const handleSourceEvent = async ({
  sourceId,
  sourceText,
  authorName,
  eventLabel,
  createReply,
}: SourceEvent): Promise<void> => {
  const appUser = await reddit.getAppUser();

  if (authorName && authorName === appUser?.username) {
    return;
  }

  const lookup = await getMatchedLookup(sourceText);
  const hasMatch = lookup.pokemon.length > 0 || lookup.filters.length > 0;
  log(`on-${eventLabel} sourceId=${sourceId} matched=${hasMatch ? 'yes' : 'no'}`);
  if (!hasMatch && eventLabel === 'comment') {
    log(`on-comment body=${JSON.stringify(sourceText)}`);
  }

  if (!hasMatch) {
    return;
  }

  try {
    const textBuilder = renderPokemonReplyText(lookup);
    const existingCreatedCommentRawId = await getCreatedCommentForSourceId(sourceId);
    const existingCreatedCommentId = normalizeCommentId(existingCreatedCommentRawId ?? undefined);

    if (existingCreatedCommentId) {
      const existingReplyComment = await reddit.getCommentById(existingCreatedCommentId);
      await existingReplyComment.edit({
        richtext: textBuilder,
        runAs: 'APP',
      });
      log(
        `updated reply-map sourceId=${sourceId} createdCommentId=${existingCreatedCommentId}`
      );
      return;
    }

    const createdComment = await createReply(textBuilder);
    const createdCommentId = normalizeCreatedCommentId(createdComment?.id);
    if (!createdCommentId) {
      warn(`${eventLabel} reply created without a valid comment id sourceId=${sourceId}`);
      return;
    }

    const replyMapKey = await storeCreatedCommentForSourceId(sourceId, createdCommentId);
    log(`stored reply-map key=${replyMapKey} sourceId=${sourceId} createdCommentId=${createdCommentId}`);
  } catch (replyError) {
    logError(`${eventLabel} reply failed sourceId=${sourceId}`, replyError);
  }
};

const handleCommentEvent = async (
  input: OnCommentSubmitRequest | OnCommentCreateRequest
) => {
  const sourceText = input.comment?.body ?? '';
  const rawCommentId = input.comment?.id;
  const sourceId = normalizeCommentId(rawCommentId);

  if (!sourceText || !sourceId) {
    log(
      `on-comment skipped body=${sourceText ? 'yes' : 'no'} rawCommentId=${rawCommentId ?? 'missing'}`
    );
    return;
  }

  await handleSourceEvent({
    sourceId,
    sourceText,
    authorName: input.comment?.author,
    eventLabel: 'comment',
    createReply: async (textBuilder) => {
      const comment = await reddit.getCommentById(sourceId);
      return await comment.reply({
        richtext: textBuilder,
        runAs: 'APP',
      });
    },
  });
};

triggers.post('/on-comment-create', async (c) => {
  const input = await c.req.json<OnCommentCreateRequest>();
  await handleCommentEvent(input);

  return c.json<TriggerResponse>({}, 200);
});

triggers.post('/on-comment-update', async (c) => {
  const input = await c.req.json<OnCommentCreateRequest>();
  await handleCommentEvent(input);

  return c.json<TriggerResponse>({}, 200);
});

const handlePostEvent = async (
  input: OnPostSubmitRequest | OnPostCreateRequest
) => {
  const sourceId = input.post?.id;

  if (!sourceId || !isT3(sourceId)) {
    return;
  }

  const sourceText = `${input.post?.title ?? ''}\n${input.post?.selftext ?? ''}`;
  await handleSourceEvent({
    sourceId,
    sourceText,
    authorName: input.author?.name,
    eventLabel: 'post',
    createReply: async (textBuilder) => {
      return await reddit.submitComment({
        id: sourceId,
        richtext: textBuilder,
        runAs: 'APP',
      });
    },
  });
};

triggers.post('/on-post-create', async (c) => {
  const input = await c.req.json<OnPostCreateRequest>();
  await handlePostEvent(input);

  return c.json<TriggerResponse>({}, 200);
});

triggers.post('/on-post-update', async (c) => {
  const input = await c.req.json<OnPostCreateRequest>();
  await handlePostEvent(input);

  return c.json<TriggerResponse>({}, 200);
});
