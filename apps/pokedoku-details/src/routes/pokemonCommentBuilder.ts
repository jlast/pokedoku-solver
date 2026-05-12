import {
  difficultyWithEmoji,
  FILTER_CATEGORIES,
  typeWithEmoji,
} from '@pokedoku-helper/shared-types';
import type { Pokemon } from '@pokedoku-helper/shared-types';
import { RichTextBuilder, type ParagraphContext } from '@devvit/web/server';
import { richTextBold, richTextItalic } from './richTextFormatting';

const BASE_URL = 'https://pokedoku-helper.com';

const slug = (value: string) =>
  value.toLowerCase().replaceAll(' ', '-').replaceAll('.', '');

type CategoryGroup = {
  label: string;
  names: string[];
};

type PokemonRuntimeInfo = {
  lastValidDaysAgo?: number;
};

const getCategoryGroups = (pokemon: Pokemon): CategoryGroup[] =>
  FILTER_CATEGORIES.map((group) => ({
    label: group.label,
    names: group.options
      .filter((option) => option.matches(pokemon))
      .map((option) => option.name)
      .filter((value, index, list) => list.indexOf(value) === index),
  })).filter((group) => group.names.length > 0);

const appendTypeRegionLine = (p: ParagraphContext, pokemon: Pokemon): void => {
  pokemon.types.forEach((type, index) => {
    if (index > 0) {
      p.text({ text: ' | ' });
    }
    p.link({
      text: typeWithEmoji(type),
      url: `${BASE_URL}/category/${slug(type)}`,
    });
  });

  p.text({ text: ' • ' });
  p.link({
    text: pokemon.region,
    url: `${BASE_URL}/category/${slug(pokemon.region)}`,
  });
};

const appendCategoryLinks = (p: ParagraphContext, pokemon: Pokemon): void => {
  const categoryGroups = getCategoryGroups(pokemon).filter(
    (group) => group.label !== 'Types' && group.label !== 'Regions'
  );

  if (categoryGroups.length === 0) {
    return;
  }

  categoryGroups.forEach((group) => {
    p.linebreak();
    const labelText = `${group.label}:`;
    p.text({ text: labelText, formatting: [richTextItalic(labelText.length)] });
    p.text({ text: ' ' });
    group.names.forEach((category, index) => {
      if (index > 0) {
        p.text({ text: ' • ' });
      }

      p.link({
        text: category,
        url: `${BASE_URL}/category/${slug(category)}`,
      });
    });
  });
};

export function buildPokemonRedditRichText(
  builder: RichTextBuilder,
  pokemon: Pokemon,
  runtimeInfo?: PokemonRuntimeInfo
): RichTextBuilder {
  const dex = String(pokemon.id).padStart(3, '0');
  const formSlug = `/pokemon/${slug(`${pokemon.name}-${pokemon.formId}`)}`;

  builder.paragraph((p) => {
    p.link({
      text: pokemon.name,
      url: `${BASE_URL}${formSlug}`,
      formatting: [richTextBold(pokemon.name.length)],
    });
    p.text({ text: ' ' });
    const dexText = `(#${dex})`;
    p.text({
      text: dexText,
      formatting: [richTextBold(dexText.length)],
    });
    p.linebreak();
    appendTypeRegionLine(p, pokemon);
    p.linebreak();
    const dexDifficultyLabel = 'Dex Difficulty';
    p.text({
      text: dexDifficultyLabel,
      formatting: [richTextItalic(dexDifficultyLabel.length)],
    });
    p.text({
      text: `: ${difficultyWithEmoji(pokemon.dexDifficulty)} `,
    });
    p.link({
      text: '(?)',
      url: `${BASE_URL}/tips#beginner-dex-difficulty`,
    });
    if (runtimeInfo?.lastValidDaysAgo != null) {
      p.linebreak();
      const lastValidLabel = 'Last valid:';
      const dayUnit = runtimeInfo.lastValidDaysAgo === 1 ? 'day' : 'days';
      p.text({ text: lastValidLabel, formatting: [richTextItalic(lastValidLabel.length)] });
      p.text({ text: ` ${runtimeInfo.lastValidDaysAgo} ${dayUnit} ago` });
    }
    appendCategoryLinks(p, pokemon);
  });

  return builder;
}

export function appendPokemonCompactLine(
  p: ParagraphContext,
  pokemon: Pokemon
): void {
  const dex = String(pokemon.id).padStart(3, '0');
  const formSlug = `/pokemon/${slug(`${pokemon.name}-${pokemon.formId}`)}`;

  p.link({ text: pokemon.name, url: `${BASE_URL}${formSlug}` });
  p.text({ text: ` (#${dex}) - ` });

  pokemon.types.forEach((type, index) => {
    if (index > 0) {
      p.text({ text: ' | ' });
    }
    p.text({ text: typeWithEmoji(type) });
  });

  p.text({ text: ` • ${pokemon.region}` });
}
