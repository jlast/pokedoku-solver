import { describe, expect, it } from 'vitest';
import { parseSettingsFromApi, parseUserDexFromApi } from './index';

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

describe('parseSettingsFromApi', () => {
  it('parses an admin flag from the API response', () => {
    expect(
      parseSettingsFromApi({
        preventSpoilerMode: false,
        myPokedexFilter: true,
        displayName: 'Ash',
        collapsePokedexAnswerFilters: false,
        isAdmin: true,
      }),
    ).toEqual({
      preventSpoilerMode: false,
      myPokedexFilter: true,
      displayName: 'Ash',
      collapsePokedexAnswerFilters: false,
      isAdmin: true,
    });
  });

  it('rejects settings responses without a boolean admin flag', () => {
    expect(
      parseSettingsFromApi({
        preventSpoilerMode: false,
        myPokedexFilter: true,
        displayName: 'Ash',
        collapsePokedexAnswerFilters: false,
      }),
    ).toBeNull();
  });
});
