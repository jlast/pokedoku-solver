import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseSettingsFromApi, parseUserDexFromApi, parseUserPuzzleFromApi, putRemoteUserPuzzle, saveAdminBonusPuzzle } from './index';

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

describe('parseUserPuzzleFromApi', () => {
  it('parses valid saved puzzle state', () => {
    expect(
      parseUserPuzzleFromApi({
        puzzleKey: '2026-07-09-bonus',
        answers: [
          { row: 0, col: 1, pokemonKeyId: '25' },
          { row: 1, col: 2, pokemonKeyId: 133 },
        ],
        completedAt: '2026-07-09T12:00:00.000Z',
        updatedAt: '2026-07-09T12:01:00.000Z',
      }),
    ).toEqual({
      puzzleKey: '2026-07-09-bonus',
      answers: [
        { row: 0, col: 1, pokemonKeyId: 25 },
        { row: 1, col: 2, pokemonKeyId: 133 },
      ],
      completedAt: '2026-07-09T12:00:00.000Z',
      updatedAt: '2026-07-09T12:01:00.000Z',
    });
  });

  it('keeps invalid timestamps as null and drops invalid answers', () => {
    expect(
      parseUserPuzzleFromApi({
        puzzleKey: '2026-07-09',
        answers: [
          { row: 0, col: 0, pokemonKeyId: 1 },
          { row: -1, col: 0, pokemonKeyId: 2 },
        ],
        completedAt: 'not-a-date',
        updatedAt: null,
      }),
    ).toEqual({
      puzzleKey: '2026-07-09',
      answers: [{ row: 0, col: 0, pokemonKeyId: 1 }],
      completedAt: null,
      updatedAt: null,
    });
  });
});

describe('putRemoteUserPuzzle', () => {
  it('puts saved puzzle state', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        puzzleKey: '2026-07-09',
        answers: [{ row: 0, col: 0, pokemonKeyId: 25 }],
        completedAt: null,
        updatedAt: '2026-07-09T12:00:00.000Z',
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    await expect(
      putRemoteUserPuzzle({
        token: 'token-123',
        apiBaseUrl: 'https://api.example.com/',
        puzzleKey: '2026-07-09',
        payload: {
          answers: [{ row: 0, col: 0, pokemonKeyId: 25 }],
          completedAt: null,
        },
      }),
    ).resolves.toEqual({
      puzzleKey: '2026-07-09',
      answers: [{ row: 0, col: 0, pokemonKeyId: 25 }],
      completedAt: null,
      updatedAt: '2026-07-09T12:00:00.000Z',
    });

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/user-puzzles/2026-07-09', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-123',
      },
      body: JSON.stringify({
        answers: [{ row: 0, col: 0, pokemonKeyId: 25 }],
        completedAt: null,
      }),
    });
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
