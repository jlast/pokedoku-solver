import { FILTER_CATEGORIES } from '@pokedoku-helper/shared-types';
import type { Pokemon } from '@pokedoku-helper/shared-types';
import { RichTextBuilder } from '@devvit/public-api';
import { ListItemContext } from '@devvit/web/server';

const BASE_URL = "https://pokedoku-helper.com";

const slug = (value: string) =>
  value.toLowerCase().replaceAll(" ", "-").replaceAll(".", "");

const getCategoryNames = (pokemon: Pokemon): string[] =>
  FILTER_CATEGORIES.flatMap((group) =>
    group.options
      .filter((option) => option.matches(pokemon))
      .map((option) => option.name)
  ).filter((value, index, list) => list.indexOf(value) === index);

const appendCategoryLinks = (item: ListItemContext, pokemon: Pokemon): void => {
  const categoryNames = getCategoryNames(pokemon);

  item.paragraph((p) => {
    p.text({ text: 'Categories: ' });
    if (categoryNames.length === 0) {
      p.text({ text: 'None' });
      return;
    }

    categoryNames.forEach((category, index) => {
      if (index > 0) {
        p.text({ text: ' | ' });
      }

      p.link({
        text: category,
        url: `${BASE_URL}/category/${slug(category)}`,
      });
    });
  });
};

export function buildPokemonRedditRichText(builder: RichTextBuilder, pokemon: Pokemon): RichTextBuilder {
    const dex = String(pokemon.id).padStart(3, '0');
    const formSlug = `/pokemon/${slug(`${pokemon.name}-${pokemon.formId}`)}`;

    builder.paragraph((p) => {
      p.link({ text: pokemon.name, url: `${BASE_URL}${formSlug}` });
      p.text({ text: ` (#${dex})` });
    });

    builder.list({ ordered: false }, (list) => {
      list.item((item) => {
        item.paragraph((p) => {
          p.text({ text: `Difficulty: ${pokemon.dexDifficulty ?? 'Unknown'}` });
        });
      });
      list.item((item) => {
        appendCategoryLinks(item, pokemon);
      });
    });


    builder.paragraph((p) => {
      p.text({ text: '🔍 View full details: ' });
      p.link({ text: pokemon.name, url: `${BASE_URL}${formSlug}` });
    });

  return builder;
}
