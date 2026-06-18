import { describe, expect, it } from 'vitest';
import type { Pokemon } from '@pokedoku-helper/shared-types';
import { __test__, resolvePokemonToken } from './pokemonCache';

const pokemonData: Pokemon[] = [
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

const pokemonMap = new Map(pokemonData.map((pokemon) => [pokemon.name.toLowerCase(), pokemon]));

describe('resolvePokemonToken', () => {
  it('returns exact matches before fuzzy matches', () => {
    const match = resolvePokemonToken('gastly', pokemonMap);

    expect(match?.name).toBe('Gastly');
  });

  it('matches common typos and form wording through fuzzy scoring', () => {
    expect(resolvePokemonToken('ghastly', pokemonMap)?.name).toBe('Gastly');
    expect(resolvePokemonToken('meowth gigantamax', pokemonMap)?.name).toBe('Meowth gmax');
  });

  it('rejects ambiguous fuzzy matches', () => {
    expect(resolvePokemonToken('charizard mega', pokemonMap)).toBeUndefined();
  });
});

describe('pokemonCache fuzzy scoring', () => {
  it('gives closer names a better score', () => {
    const exactishScore = __test__.scorePokemonName('ghastly', 'Gastly');
    const unrelatedScore = __test__.scorePokemonName('ghastly', 'Meowth gmax');

    expect(exactishScore).toBeGreaterThan(unrelatedScore);
    expect(exactishScore).toBeGreaterThan(0.84);
  });
});
