import { describe, expect, it, vi } from 'vitest';
import type { Pokemon } from '@pokedoku-helper/shared-types';

const pokemonData: Pokemon[] = [
  {
    id: 76,
    name: 'Golem',
    types: ['Rock', 'Ground'],
    region: ['Kanto'],
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
    region: ['Kanto'],
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
    region: ['Kanto'],
    evolutionStage: 'Final Stage',
    evolutionTrigger: ['Evolved by Item'],
    categories: [],
    dexDifficulty: 'Expert',
    dexDifficultyPercentile: 0.8,
    formId: 136,
  },
  {
    id: 52,
    name: 'Meowth gmax',
    types: ['Normal'],
    region: ['Kanto'],
    categories: ['Gigantamax'],
    dexDifficulty: 'Hard',
    dexDifficultyPercentile: 0.72,
    formId: 10369,
  },
  {
    id: 92,
    name: 'Gastly',
    types: ['Ghost', 'Poison'],
    region: ['Kanto'],
    evolutionStage: 'First Stage',
    categories: [],
    dexDifficulty: 'Normal',
    dexDifficultyPercentile: 0.41,
    formId: 92,
  },
  {
    id: 6,
    name: 'Charizard mega x',
    types: ['Fire', 'Dragon'],
    region: ['Kanto'],
    categories: ['Mega Evolution'],
    dexDifficulty: 'Expert',
    dexDifficultyPercentile: 0.86,
    formId: 10134,
  },
  {
    id: 6,
    name: 'Charizard mega y',
    types: ['Fire', 'Flying'],
    region: ['Kanto'],
    categories: ['Mega Evolution'],
    dexDifficulty: 'Expert',
    dexDifficultyPercentile: 0.87,
    formId: 10135,
  },
];

vi.mock('../core/pokemonCache', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../core/pokemonCache')>();

  return {
    ...actual,
    getPokemonMap: async () =>
      new Map(pokemonData.map((pokemon) => [pokemon.name.toLowerCase(), pokemon])),
  };
});

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

  it('preserves dual-type token order for runtime stats lookup', async () => {
    const { __test__ } = await import('./triggers');

    const lookup = await __test__.getMatchedLookup('[[Flying+Fire]], [[Fire+Flying]]');

    expect(lookup.filters.map((filter) => filter.name)).toEqual([
      'Flying + Fire',
      'Fire + Flying',
    ]);
    expect(lookup.filters[0]?.runtimeTypePair).toEqual({ left: 'Flying', right: 'Fire' });
    expect(lookup.filters[1]?.runtimeTypePair).toEqual({ left: 'Fire', right: 'Flying' });
  });

  it('fuzzy matches Pokemon names and form wording', async () => {
    const { __test__ } = await import('./triggers');

    const lookup = await __test__.getMatchedLookup('[[Meowth gigantamax]], [[ghastly]]');

    expect(lookup.pokemon.map((pokemon) => pokemon.name)).toEqual(['Meowth gmax', 'Gastly']);
  });

  it('does not guess when a fuzzy match is ambiguous', async () => {
    const { __test__ } = await import('./triggers');

    const lookup = await __test__.getMatchedLookup('[[charizard mega]]');

    expect(lookup.pokemon).toEqual([]);
    expect(lookup.filters).toEqual([]);
  });
});
