import { describe, expect, it } from 'vitest';
import { parseUserDexFromApi } from './index';

describe('parseUserDexFromApi', () => {
  it('parses a valid updatedAt timestamp', () => {
    expect(
      parseUserDexFromApi({
        caughtPokemonKeyIds: [25, '133'],
        shinyPokemonKeyIds: ['133', 999],
        unlockedPrestigeLevelIndex: 2,
        updatedAt: '2026-05-27T05:15:00.000Z',
      }),
    ).toEqual({
      caughtPokemonKeyIds: [25, 133],
      shinyPokemonKeyIds: [133],
      unlockedPrestigeLevelIndex: 2,
      updatedAt: '2026-05-27T05:15:00.000Z',
    });
  });

  it('falls back to null when updatedAt is missing or invalid', () => {
    expect(
      parseUserDexFromApi({
        caughtPokemonKeyIds: [25],
        shinyPokemonKeyIds: [],
        unlockedPrestigeLevelIndex: 0,
      }),
    ).toEqual({
      caughtPokemonKeyIds: [25],
      shinyPokemonKeyIds: [],
      unlockedPrestigeLevelIndex: 0,
      updatedAt: null,
    });

    expect(
      parseUserDexFromApi({
        caughtPokemonKeyIds: [25],
        shinyPokemonKeyIds: [],
        unlockedPrestigeLevelIndex: 0,
        updatedAt: 'not-a-date',
      }),
    ).toEqual({
      caughtPokemonKeyIds: [25],
      shinyPokemonKeyIds: [],
      unlockedPrestigeLevelIndex: 0,
      updatedAt: null,
    });
  });
});
