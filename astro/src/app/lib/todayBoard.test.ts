import type { Pokemon } from '@pokedoku-helper/shared-types';
import { describe, expect, it } from 'vitest';
import type { Constraint } from '../../../../lib/shared/filters';
import { assignSuggestedCellsFromCandidates, buildFallbackOwnedCells } from './todayBoard';

function createPokemon(id: number, name: string): Pokemon {
  return {
    id,
    formId: id,
    name,
    types: ['Fire'],
    dexDifficulty: 'Nightmare',
    dexDifficultyPercentile: 99,
  };
}

describe('assignSuggestedCellsFromCandidates', () => {
  it('reassigns earlier picks to avoid duplicates when a unique grid exists', () => {
    const alpha = createPokemon(1, 'Alpha');
    const beta = createPokemon(2, 'Beta');
    const gamma = createPokemon(3, 'Gamma');
    const delta = createPokemon(4, 'Delta');

    const cells = assignSuggestedCellsFromCandidates([
      [[alpha, beta], [alpha, gamma]],
      [[gamma], [delta]],
    ]);

    expect(cells[0][0]?.name).toBe('Beta');
    expect(cells[0][1]?.name).toBe('Alpha');
    expect(cells[1][0]?.name).toBe('Gamma');
    expect(cells[1][1]?.name).toBe('Delta');
  });

  it('leaves an unmatched cell empty instead of reusing a duplicate when fallback is disabled', () => {
    const alpha = createPokemon(1, 'Alpha');

    const cells = assignSuggestedCellsFromCandidates(
      [
        [[alpha], [alpha]],
        [[], []],
      ],
      [],
      false,
    );

    expect([cells[0][0]?.name, cells[0][1]?.name].filter(Boolean)).toEqual(['Alpha']);
    expect(cells[1][0]).toBeNull();
    expect(cells[1][1]).toBeNull();
  });
});

describe('buildFallbackOwnedCells', () => {
  it('avoids reusing a suggested pokemon when another owned fallback fits', () => {
    const manectricMega = {
      ...createPokemon(310, 'Manectric mega'),
      formId: 1001310,
      types: ['Electric'],
      region: 'Hoenn',
      categories: ['Mega Evolution'],
      evolutionTrigger: ['Evolved by Item'],
    } satisfies Pokemon;
    const ampharosMega = {
      ...createPokemon(181, 'Ampharos mega'),
      formId: 1001181,
      types: ['Electric'],
      region: 'Johto',
      categories: ['Mega Evolution'],
      evolutionTrigger: ['Evolved by Item'],
    } satisfies Pokemon;

    const pokemon = [manectricMega, ampharosMega];
    const gridCells = [
      [manectricMega, null],
      [null, null],
    ];
    const rowConstraints: (Constraint | null)[] = [
      { category: 'type', value: 'Electric' },
      { category: 'type', value: 'Electric' },
    ];
    const colConstraints: (Constraint | null)[] = [
      { category: 'category', value: 'Mega Evolution' },
      { category: 'category', value: 'Mega Evolution' },
    ];
    const possiblePokemon = [
      [[manectricMega], []],
      [[], []],
    ];

    const fallbackCells = buildFallbackOwnedCells({
      pokemon,
      gridCells,
      rowConstraints,
      colConstraints,
      possiblePokemon,
      caughtSet: new Set([1001310, 1001181]),
      shinyPokemonKeyIds: new Set(),
    });

    expect(fallbackCells[1][0]?.name).toBe('Ampharos mega');
  });

  it('reassigns fallback picks to keep owned cells unique when possible', () => {
    const alpha = {
      ...createPokemon(1, 'Alpha'),
      types: ['Fire'],
      categories: ['Mega Evolution'],
    } satisfies Pokemon;
    const beta = {
      ...createPokemon(2, 'Beta'),
      types: ['Fire'],
      categories: ['Mega Evolution'],
    } satisfies Pokemon;
    const gamma = {
      ...createPokemon(3, 'Gamma'),
      types: ['Water'],
      categories: ['Mega Evolution'],
    } satisfies Pokemon;
    const delta = {
      ...createPokemon(4, 'Delta'),
      types: ['Water'],
      categories: ['Mega Evolution'],
    } satisfies Pokemon;

    const pokemon = [alpha, beta, gamma, delta];
    const rowConstraints: (Constraint | null)[] = [
      { category: 'type', value: 'Fire' },
      { category: 'type', value: 'Water' },
    ];
    const colConstraints: (Constraint | null)[] = [
      { category: 'category', value: 'Mega Evolution' },
      { category: 'category', value: 'Mega Evolution' },
    ];

    const fallbackCells = buildFallbackOwnedCells({
      pokemon,
      gridCells: [
        [null, null],
        [null, null],
      ],
      rowConstraints,
      colConstraints,
      possiblePokemon: [
        [[], []],
        [[], []],
      ],
      caughtSet: new Set([1, 2, 3, 4]),
      shinyPokemonKeyIds: new Set(),
    });

    const names = fallbackCells.flat().map((cell) => cell?.name);

    expect(new Set(names).size).toBe(4);
    expect(names).toContain('Alpha');
    expect(names).toContain('Beta');
    expect(names).toContain('Gamma');
    expect(names).toContain('Delta');
  });
});
