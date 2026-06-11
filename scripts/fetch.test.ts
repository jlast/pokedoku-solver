import { describe, expect, it } from 'vitest';

import type { InternalPokemon } from '@pokedoku-helper/shared-types';

import { getShinySpritePath, getSpriteImagePath } from './fetch';
import { getValidDexDifficultyCombinationCounts } from './lib/dex-difficulty';

describe('sprite helpers', () => {
  it('builds default and shiny sprite asset paths', () => {
    expect(getSpriteImagePath(25)).toBe('/images/sprites/25.png');
    expect(getSpriteImagePath(25, 'shiny')).toBe('/images/sprites/25-shiny.png');
  });

  it('only exposes a shiny sprite path when pokeapi provides one', () => {
    expect(
      getShinySpritePath({
        id: 25,
        sprites: {
          front_default: 'https://example.com/25.png',
          front_shiny: 'https://example.com/25-shiny.png',
        },
      }),
    ).toBe('/images/sprites/25-shiny.png');

    expect(
      getShinySpritePath({
        id: 25,
        sprites: {
          front_default: 'https://example.com/25.png',
          front_shiny: null,
        },
      }),
    ).toBeUndefined();
  });
});

describe('dex difficulty combination counting', () => {
  it('ignores category pairs that only exist within one evolution line', () => {
    const pokemonList: InternalPokemon[] = [
      {
        id: 1,
        name: 'Mon A',
        types: ['Fire'],
        region: ['Kanto'],
        evolutionStage: 'First Stage',
        categories: ['Legendary'],
        evolution: { to: [2] },
      },
      {
        id: 2,
        name: 'Mon B',
        types: ['Fire'],
        region: ['Kanto'],
        evolutionStage: 'Final Stage',
        categories: ['Legendary'],
        evolution: { from: [1] },
      },
      {
        id: 3,
        name: 'Mon C',
        types: ['Water'],
        region: ['Johto'],
        evolutionStage: 'No Evolution Line',
        categories: ['Mythical'],
      },
    ];

    const counts = getValidDexDifficultyCombinationCounts(pokemonList);

    expect(counts['Fire+Legendary']).toBeUndefined();
  });

  it('counts category pairs once per distinct evolution line', () => {
    const pokemonList: InternalPokemon[] = [
      {
        id: 10,
        name: 'Line One A',
        types: ['Fire'],
        region: ['Kanto'],
        evolutionStage: 'First Stage',
        categories: ['Legendary'],
        evolution: { to: [11] },
      },
      {
        id: 11,
        name: 'Line One B',
        types: ['Fire'],
        region: ['Kanto'],
        evolutionStage: 'Final Stage',
        categories: ['Legendary'],
        evolution: { from: [10] },
      },
      {
        id: 20,
        name: 'Line Two A',
        types: ['Fire'],
        region: ['Johto'],
        evolutionStage: 'First Stage',
        categories: ['Legendary'],
        evolution: { to: [21] },
      },
      {
        id: 21,
        name: 'Line Two B',
        types: ['Fire'],
        region: ['Johto'],
        evolutionStage: 'Final Stage',
        categories: ['Legendary'],
        evolution: { from: [20] },
      },
    ];

    const counts = getValidDexDifficultyCombinationCounts(pokemonList);

    expect(counts['Fire+Legendary']).toBe(2);
  });

  it('treats unconnected no-evolution pokemon as separate lines', () => {
    const pokemonList: InternalPokemon[] = [
      {
        id: 100,
        name: 'Solo One',
        types: ['Psychic'],
        region: ['Kanto'],
        evolutionStage: 'No Evolution Line',
        categories: ['Mythical'],
      },
      {
        id: 200,
        name: 'Solo Two',
        types: ['Psychic'],
        region: ['Johto'],
        evolutionStage: 'No Evolution Line',
        categories: ['Mythical'],
      },
    ];

    const counts = getValidDexDifficultyCombinationCounts(pokemonList);

    expect(counts['Psychic+Mythical']).toBe(2);
  });
});
