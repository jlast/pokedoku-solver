import type { Pokemon } from '@pokedoku-helper/shared-types';
import { describe, expect, it } from 'vitest';
import type { Constraint } from '../../../../lib/shared/filters';
import { assignSuggestedCellsFromCandidates, buildFallbackOwnedCells, buildPersonalizedRemainingGroupScoreMap, buildSuggestedCells } from './todayBoard';

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
    const fallbackCells = buildFallbackOwnedCells({
      pokemon,
      gridCells,
      rowConstraints,
      colConstraints,
      caughtSet: new Set([1001310, 1001181]),
      shinyPokemonKeyIds: new Set(),
    });

    const fallbackNames = fallbackCells.flat().map((cell) => cell?.name).filter(Boolean);

    expect(fallbackNames).toContain('Ampharos mega');
    expect(fallbackNames).not.toContain('Manectric mega');
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

describe('buildPersonalizedRemainingGroupScoreMap', () => {
  it('scores Pokemon by their highest minimal remaining allowed group count', () => {
    const alpha = {
      ...createPokemon(1, 'Alpha'),
      types: ['Fire'],
      region: 'Kanto',
      evolutionStage: 'Final Stage',
      categories: ['Legendary'],
    } satisfies Pokemon;
    const beta = {
      ...createPokemon(2, 'Beta'),
      types: ['Fire'],
      region: 'Kanto',
      evolutionStage: 'Final Stage',
      categories: ['Legendary'],
    } satisfies Pokemon;
    const gamma = {
      ...createPokemon(3, 'Gamma'),
      types: ['Fire'],
      region: 'Johto',
      evolutionStage: 'Final Stage',
      categories: ['Legendary'],
    } satisfies Pokemon;
    const delta = {
      ...createPokemon(4, 'Delta'),
      types: ['Fire'],
      region: 'Hoenn',
      evolutionStage: 'Final Stage',
      categories: ['Legendary'],
    } satisfies Pokemon;
    const epsilon = {
      ...createPokemon(5, 'Epsilon'),
      types: ['Water'],
      region: 'Kanto',
      evolutionStage: 'Final Stage',
      categories: ['Legendary'],
    } satisfies Pokemon;

    const scoreMap = buildPersonalizedRemainingGroupScoreMap({
      pokemon: [alpha, beta, gamma, delta, epsilon],
      remainingPokemon: [alpha, beta, gamma, delta, epsilon],
    });

    expect(scoreMap.get(1)).toBe(2);
    expect(scoreMap.get(2)).toBe(2);
    expect(scoreMap.get(3)).toBe(4);
    expect(scoreMap.get(4)).toBe(4);
    expect(scoreMap.get(5)).toBe(3);
  });

  it('ignores move and ability groups when scoring remaining combinations', () => {
    const alpha = {
      ...createPokemon(1, 'Alpha'),
      types: ['Fire'],
      region: 'Kanto',
      evolutionStage: 'Final Stage',
      categories: ['Legendary'],
      learnedMoves: ['Surf'],
      abilities: ['Swift Swim'],
    } satisfies Pokemon;
    const beta = {
      ...createPokemon(2, 'Beta'),
      types: ['Water'],
      region: 'Kanto',
      evolutionStage: 'Final Stage',
      categories: ['Legendary'],
      learnedMoves: ['Surf'],
      abilities: ['Swift Swim'],
    } satisfies Pokemon;
    const gamma = {
      ...createPokemon(3, 'Gamma'),
      types: ['Grass'],
      region: 'Kanto',
      evolutionStage: 'Final Stage',
      categories: ['Legendary'],
      learnedMoves: ['Surf'],
      abilities: ['Swift Swim'],
    } satisfies Pokemon;

    const scoreMap = buildPersonalizedRemainingGroupScoreMap({
      pokemon: [alpha, beta, gamma],
      remainingPokemon: [alpha, beta, gamma],
    });

    expect(scoreMap.get(1)).toBe(3);
    expect(scoreMap.get(2)).toBe(3);
    expect(scoreMap.get(3)).toBe(3);
  });
});

describe('buildSuggestedCells', () => {
  it('prefers the candidate with the highest minimal remaining group score', () => {
    const alpha = {
      ...createPokemon(1, 'Alpha'),
      dexDifficulty: 'Easy',
      dexDifficultyPercentile: 1,
      types: ['Fire'],
      region: 'Kanto',
      evolutionStage: 'Final Stage',
      categories: ['Legendary'],
    } satisfies Pokemon;
    const beta = {
      ...createPokemon(2, 'Beta'),
      dexDifficulty: 'Nightmare',
      dexDifficultyPercentile: 99,
      types: ['Fire'],
      region: 'Johto',
      evolutionStage: 'Final Stage',
      categories: ['Legendary'],
    } satisfies Pokemon;
    const gamma = {
      ...createPokemon(3, 'Gamma'),
      types: ['Fire'],
      region: 'Kanto',
      evolutionStage: 'Final Stage',
      categories: ['Legendary'],
    } satisfies Pokemon;
    const delta = {
      ...createPokemon(4, 'Delta'),
      types: ['Fire'],
      region: 'Hoenn',
      evolutionStage: 'Final Stage',
      categories: ['Legendary'],
    } satisfies Pokemon;
    const epsilon = {
      ...createPokemon(5, 'Epsilon'),
      types: ['Water'],
      region: 'Kanto',
      evolutionStage: 'Final Stage',
      categories: ['Legendary'],
    } satisfies Pokemon;

    const pokemon = [alpha, beta, gamma, delta, epsilon];
    const scoreMap = buildPersonalizedRemainingGroupScoreMap({
      pokemon,
      remainingPokemon: pokemon,
    });
    const { cells } = buildSuggestedCells(
      pokemon,
      [{ category: 'type', value: 'Fire' }],
      [{ category: 'category', value: 'Legendary' }],
      scoreMap,
    );

    expect(cells[0][0]?.name).toBe('Beta');
  });

  it('falls back to difficulty ordering when personalized scores tie', () => {
    const alpha = {
      ...createPokemon(1, 'Alpha'),
      dexDifficulty: 'Easy',
      dexDifficultyPercentile: 1,
      types: ['Fire'],
      region: 'Kanto',
      evolutionStage: 'Final Stage',
      categories: ['Legendary'],
    } satisfies Pokemon;
    const beta = {
      ...createPokemon(2, 'Beta'),
      dexDifficulty: 'Nightmare',
      dexDifficultyPercentile: 99,
      types: ['Fire'],
      region: 'Kanto',
      evolutionStage: 'Final Stage',
      categories: ['Legendary'],
    } satisfies Pokemon;

    const pokemon = [alpha, beta];
    const scoreMap = buildPersonalizedRemainingGroupScoreMap({
      pokemon,
      remainingPokemon: pokemon,
    });
    const { cells } = buildSuggestedCells(
      pokemon,
      [{ category: 'type', value: 'Fire' }],
      [{ category: 'category', value: 'Legendary' }],
      scoreMap,
    );

    expect(scoreMap.get(1)).toBe(scoreMap.get(2));
    expect(cells[0][0]?.name).toBe('Beta');
  });
});
