import type { Pokemon } from '@pokedoku-helper/shared-types';

const BASE_URL = "https://pokedoku-helper.com";

const slug = (value: string) =>
  value.toLowerCase().replaceAll(" ", "-").replaceAll(".", "");

const link = (label: string, path: string) =>
  `[${label}](${BASE_URL}${path})`;

const rarityText = (percentile: number) => {
  const commonPercent = Math.max(1, Math.round(percentile * 100));
  return `Top ${commonPercent}% hardest picks`;
};

export function formatPokemonRedditComment(pokemon: Pokemon): string {
  const dex = String(pokemon.id).padStart(3, "0");

  const typeLinks = pokemon.types
    .map((type) => link(type, `/type/${slug(type)}`))
    .join(" | ");

  const categoryLinks = pokemon.categories
    ?.map((category) => link(category, `/category/${slug(category)}`))
    .join(" • ");

  return [
    `**[[${link(pokemon.name, `/pokemon/${slug(pokemon.name)}`)}]] (#${dex})**`,
    `${typeLinks} • ${link(pokemon.region, `/region/${slug(pokemon.region)}`)}`,
    "",
    `• Difficulty: **${pokemon.dexDifficulty}**`,
    `• Rarity: **${rarityText(pokemon.dexDifficultyPercentile)}**`,
    pokemon.evolutionStage ? `• Evolution: ${link(pokemon.evolutionStage, `/evolution/${slug(pokemon.evolutionStage)}`)}` : "",
    `• Categories: ${categoryLinks}`,
    "",
    `🔎 ${link("View full details & live stats", `/pokemon/${slug(pokemon.name)}`)}`
  ].join("\n");
}
