import type { ParagraphContext, RichTextBuilder } from '@devvit/web/server';
import { difficultyWithEmoji } from '@pokedoku-helper/shared-types';
import type { Pokemon } from '@pokedoku-helper/shared-types';
import { richTextBold, richTextItalic } from './richTextFormatting';
import { BASE_URL } from '../core/constants';

export type MatchedFilter = {
  categoryLabel: string;
  name: string;
  linkSlug: string;
  count: number;
  difficultyDistribution?: string;
  lastSeenDaysAgo?: number;
  runtimeCategoryName?: string;
  runtimeTypePair?: {
    left: string;
    right: string;
  };
};

const difficultyRank: Record<string, number> = {
  Impossible: 6,
  Nightmare: 5,
  Expert: 4,
  Hard: 3,
  Normal: 2,
  Easy: 1,
};

export const formatTypeDifficultyStats = (pokemon: Pokemon[]): {
  distribution: string;
  averageDifficulty: string;
} => {
  const counts = new Map<string, number>();
  let percentileSum = 0;
  let percentileCount = 0;

  for (const entry of pokemon) {
    if (entry.dexDifficulty) {
      counts.set(entry.dexDifficulty, (counts.get(entry.dexDifficulty) ?? 0) + 1);
    }
    if (typeof entry.dexDifficultyPercentile === 'number') {
      percentileSum += entry.dexDifficultyPercentile;
      percentileCount += 1;
    }
  }

  const distribution = Array.from(counts.entries())
    .sort((a, b) => (difficultyRank[a[0]] ?? 0) - (difficultyRank[b[0]] ?? 0))
    .map(([difficulty, count]) => `${difficulty}: ${count}`)
    .join(' | ');

  if (percentileCount === 0) {
    const mode =
      Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Unknown';
    return {
      distribution,
      averageDifficulty: mode,
    };
  }

  const averagePercentile = percentileSum / percentileCount;
  const closest = pokemon
    .filter(
      (entry): entry is Pokemon & { dexDifficulty: string; dexDifficultyPercentile: number } =>
        typeof entry.dexDifficulty === 'string' &&
        typeof entry.dexDifficultyPercentile === 'number'
    )
    .reduce((best, current) => {
      const bestDistance = Math.abs(best.dexDifficultyPercentile - averagePercentile);
      const currentDistance = Math.abs(current.dexDifficultyPercentile - averagePercentile);

      if (currentDistance < bestDistance) {
        return current;
      }
      if (currentDistance > bestDistance) {
        return best;
      }
      return current.dexDifficultyPercentile > best.dexDifficultyPercentile ? current : best;
    });

  return {
    distribution,
    averageDifficulty: closest?.dexDifficulty ?? 'Unknown',
  };
};

const slug = (value: string): string =>
  value.toLowerCase().replaceAll(' ', '-').replaceAll('.', '');

const formatDistributionWithEmoji = (distribution: string): string =>
  distribution
    .split('|')
    .map((part) => part.trim())
    .map((part) => {
      const [rawDifficulty, rawCount] = part.split(':').map((value) => value.trim());
      const difficulty = rawDifficulty ?? '';
      const count = rawCount ?? '';
      if (!difficulty || !count) {
        return part;
      }
      return `${difficultyWithEmoji(difficulty)}: ${count}`;
    })
    .join(' | ');

export const appendFilterStats = (
  builder: RichTextBuilder,
  filter: MatchedFilter
): void => {
  builder.paragraph((p) => {
    p.link({
      text: filter.name,
      url: `${BASE_URL}/tools/category/${slug(filter.linkSlug)}`,
      formatting: [richTextBold(filter.name.length)],
    });
    p.linebreak();
    p.text({ text: `${filter.count} valid answers` });

    if (typeof filter.difficultyDistribution === 'string') {
      p.linebreak();
      p.text({
        text: `${formatDistributionWithEmoji(filter.difficultyDistribution)}`,
      });
    }

    if (typeof filter.lastSeenDaysAgo === 'number') {
      p.linebreak();
      const lastSeenLabel = 'Last seen:';
      const dayUnit = filter.lastSeenDaysAgo === 1 ? 'day' : 'days';
      p.text({ text: lastSeenLabel, formatting: [richTextItalic(lastSeenLabel.length)]});
      p.text({ text: ` ${filter.lastSeenDaysAgo} ${dayUnit} ago` });
    }
  });
};

export const appendFilterCompactLine = (
  p: ParagraphContext,
  filter: MatchedFilter
): void => {
    p.link({
      text: filter.name,
      url: `${BASE_URL}/tools/category/${slug(filter.linkSlug)}`,
    });
    p.text({ text: ` - ${filter.count} answers` });
};
