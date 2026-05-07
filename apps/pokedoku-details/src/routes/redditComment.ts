import {
  difficultyWithEmoji,
  FILTER_CATEGORIES,
  typeWithEmoji,
} from '@pokedoku-helper/shared-types';
import type { Pokemon } from '@pokedoku-helper/shared-types';
import { RichTextBuilder } from '@devvit/public-api';
import { makeFormatting } from '@devvit/shared-types/richtext/elements.js';
import type { ParagraphContext } from '@devvit/web/server';

const BASE_URL = 'https://pokedoku-helper.com';

const slug = (value: string) =>
  value.toLowerCase().replaceAll(' ', '-').replaceAll('.', '');

type CategoryGroup = {
  label: string;
  names: string[];
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
      p.text({ text: '• ' });
      p.text({ text: `${group.label}: ` });

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
  pokemon: Pokemon
): RichTextBuilder {
  const dex = String(pokemon.id).padStart(3, '0');
  const formSlug = `/pokemon/${slug(`${pokemon.name}-${pokemon.formId}`)}`;

  builder.paragraph((p) => {
    p.link({
      text: pokemon.name,
      url: `${BASE_URL}${formSlug}`,
      formatting: [
        makeFormatting({ bold: true, startIndex: 0, length: pokemon.name.length }),
      ],
    });
    p.text({ text: ' ' });
    const dexText = `(#${dex})`;
    p.text({
      text: dexText,
      formatting: [makeFormatting({ bold: true, startIndex: 0, length: dexText.length })],
    });
    p.linebreak();
    appendTypeRegionLine(p, pokemon);
    p.linebreak();
    p.linebreak();
    p.text({ text: '• ' });
    p.link({
      text: 'Dex Difficulty',
      url: `${BASE_URL}/tips#beginner-dex-difficulty`,
    });
    p.text({
      text: `: ${difficultyWithEmoji(pokemon.dexDifficulty)}`,
    });
    appendCategoryLinks(p, pokemon);
  });


  return builder;
}
