import { describe, expect, it, vi } from 'vitest';
import type { Pokemon } from '@pokedoku-helper/shared-types';

const pokemonData: Pokemon[] = [
  {
    id: 76,
    name: 'Golem',
    types: ['Rock', 'Ground'],
    region: 'Kanto',
    evolutionStage: 'Final Stage',
    evolutionTrigger: ['Evolved by Trade'],
    categories: [],
    dexDifficulty: 'Normal',
    dexDifficultyPercentile: 0.5,
    formId: 76,
  },
  {
    id: 6,
    name: 'Charizard',
    types: ['Fire', 'Flying'],
    region: 'Kanto',
    evolutionStage: 'Final Stage',
    evolutionTrigger: ['Evolved by Level'],
    categories: [],
    dexDifficulty: 'Hard',
    dexDifficultyPercentile: 0.7,
    formId: 6,
  },
  {
    id: 136,
    name: 'Flareon',
    types: ['Fire'],
    region: 'Kanto',
    evolutionStage: 'Final Stage',
    evolutionTrigger: ['Evolved by Item'],
    categories: [],
    dexDifficulty: 'Expert',
    dexDifficultyPercentile: 0.8,
    formId: 136,
  },
];

vi.mock('../core/pokemonCache', () => ({
  getPokemonMap: async () =>
    new Map(pokemonData.map((pokemon) => [pokemon.name.toLowerCase(), pokemon])),
}));

describe('triggers integration parsing', () => {
  it('parses mixed pokemon, category, and category+category tokens', async () => {
    const { __test__ } = await import('./triggers');

    const lookup = await __test__.getMatchedLookup(
      'I want to learn more about: [[Ground+Kanto]], [[Fire+Final Stage]], [[Fire]], [[Golem]], [[Kanto]]'
    );

    expect(lookup.pokemon.map((pokemon) => pokemon.name)).toEqual(['Golem']);
    expect(lookup.filters.map((filter) => filter.name)).toEqual([
      'Ground + Kanto',
      'Fire + Final Stage',
      'Fire',
      'Kanto',
    ]);
    expect(lookup.filters.every((filter) => typeof filter.linkSlug === 'string')).toBe(true);
  });
});
