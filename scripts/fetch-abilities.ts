import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { fetchWithRetry } from './lib';
import { POKEMON_ABILITIES, type PokemonAbility } from '@pokedoku-helper/shared-types';

const POKEAPI_ABILITY_LIST_URL = 'https://pokeapi.co/api/v2/ability?limit=10000';

interface AbilityListResponse {
  results: { name: string; url: string }[];
}

interface AbilityPokemonResponse {
  pokemon: { pokemon: { name: string; url: string } }[];
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ABILITY_CACHE_DIR = path.join(__dirname, '.cache', 'abilities');
const ABILITY_LIST_CACHE_FILE = path.join(__dirname, '.cache', 'abilities-list.json');

function toAbilitySlug(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '-');
}

async function main(): Promise<void> {
  const listResponse = await fetchWithRetry<AbilityListResponse>(POKEAPI_ABILITY_LIST_URL);
  if (!listResponse) {
    throw new Error('Failed to fetch ability list from PokeAPI');
  }

  fs.mkdirSync(ABILITY_CACHE_DIR, { recursive: true });
  fs.writeFileSync(ABILITY_LIST_CACHE_FILE, JSON.stringify(listResponse, null, 2));

  const whitelistSlugs = new Map<string, PokemonAbility>(
    POKEMON_ABILITIES.map((ability) => [toAbilitySlug(ability), ability]),
  );

  const whitelistedAbilities = listResponse.results
    .filter((ability) => whitelistSlugs.has(ability.name))
    .map((ability) => ({
      slug: ability.name,
      abilityName: whitelistSlugs.get(ability.name)!,
      url: ability.url,
    }));

  for (const ability of whitelistedAbilities) {
    const response = await fetchWithRetry<AbilityPokemonResponse>(ability.url);
    if (!response) {
      throw new Error(`Failed to fetch ability details for ${ability.abilityName}`);
    }

    const abilityCacheFile = path.join(ABILITY_CACHE_DIR, `${ability.slug}.json`);
    fs.writeFileSync(abilityCacheFile, JSON.stringify(response, null, 2));
  }

  console.log(`Saved raw ability API responses to ${ABILITY_CACHE_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
