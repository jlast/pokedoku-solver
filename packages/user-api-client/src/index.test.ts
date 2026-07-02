import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseSettingsFromApi, parseUserDexFromApi, saveAdminBonusPuzzle } from './index';

afterEach(() => {
  vi.restoreAllMocks();
});

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

describe('saveAdminBonusPuzzle', () => {
  it('posts the admin bonus puzzle payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        date: '2026-07-02',
        updatedTodayPuzzle: true,
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      saveAdminBonusPuzzle({
        token: 'token-123',
        apiBaseUrl: 'https://api.example.com/',
        date: '2026-07-02',
        rowConstraints: [{ category: 'type', value: 'Fire' }],
        colConstraints: [{ category: 'region', value: 'Kanto' }],
      }),
    ).resolves.toEqual({
      date: '2026-07-02',
      updatedTodayPuzzle: true,
    });

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/admin/bonus-puzzle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-123',
      },
      body: JSON.stringify({
        date: '2026-07-02',
        rowConstraints: [{ category: 'type', value: 'Fire' }],
        colConstraints: [{ category: 'region', value: 'Kanto' }],
      }),
    });
  });
});
