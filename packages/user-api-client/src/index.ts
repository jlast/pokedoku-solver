export type UserDexPayload = {
  caughtPokemonKeyIds: number[];
  shinyPokemonKeyIds: number[];
  unlockedPrestigeLevelIndex: number;
  updatedAt: string | null;
};

export type SettingsPayload = {
  preventSpoilerMode: boolean;
  myPokedexFilter: boolean;
  displayName: string;
  collapsePokedexAnswerFilters: boolean;
  isAdmin: boolean;
};

export type SharedUserDexPayload = UserDexPayload & {
  userId: string;
  displayName: string;
};

export type PuzzleConstraintPayload = {
  category: string;
  value: string;
};

export type SaveBonusPuzzleResult = {
  date: string;
  updatedTodayPuzzle: boolean;
};

function normalizeApiBaseUrl(apiBaseUrl: string): string {
  return apiBaseUrl.replace(/\/+$/, '');
}

export function parseUserDexFromApi(
  data: unknown,
  maxPrestigeLevelIndex = Number.POSITIVE_INFINITY
): UserDexPayload | null {
  if (!data || typeof data !== 'object') return null;
  const payload = data as {
    caughtPokemonKeyIds?: unknown;
    shinyPokemonKeyIds?: unknown;
    unlockedPrestigeLevelIndex?: unknown;
    updatedAt?: unknown;
  };
  if (!Array.isArray(payload.caughtPokemonKeyIds)) return null;

  const caughtPokemonKeyIds = payload.caughtPokemonKeyIds
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry) && entry > 0);

  const caughtSet = new Set(caughtPokemonKeyIds);
  const shinyPokemonKeyIds = (Array.isArray(payload.shinyPokemonKeyIds) ? payload.shinyPokemonKeyIds : [])
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry) && entry > 0 && caughtSet.has(entry));

  const rawPrestigeIndex = Number(payload.unlockedPrestigeLevelIndex);
  const unlockedPrestigeLevelIndex = Number.isInteger(rawPrestigeIndex) && rawPrestigeIndex >= 0
    ? Math.min(rawPrestigeIndex, maxPrestigeLevelIndex)
    : 0;

  const updatedAt = typeof payload.updatedAt === 'string' && payload.updatedAt.trim().length > 0
    && !Number.isNaN(Date.parse(payload.updatedAt))
    ? payload.updatedAt
    : null;

  return { caughtPokemonKeyIds, shinyPokemonKeyIds, unlockedPrestigeLevelIndex, updatedAt };
}

export async function getRemoteUserDex({
  token,
  apiBaseUrl,
  maxPrestigeLevelIndex,
}: {
  token: string;
  apiBaseUrl: string;
  maxPrestigeLevelIndex?: number;
}): Promise<UserDexPayload | null> {
  const response = await fetch(`${normalizeApiBaseUrl(apiBaseUrl)}/user-dex`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) return null;
  const data = (await response.json()) as unknown;
  return parseUserDexFromApi(data, maxPrestigeLevelIndex);
}

export async function patchRemoteUserDex({
  token,
  apiBaseUrl,
  payload,
}: {
  token: string;
  apiBaseUrl: string;
  payload: UserDexPayload;
}): Promise<boolean> {
  const response = await fetch(`${normalizeApiBaseUrl(apiBaseUrl)}/user-dex`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  return response.ok;
}

export function parseSettingsFromApi(data: unknown): SettingsPayload | null {
  if (!data || typeof data !== 'object') return null;
  const payload = data as {
    preventSpoilerMode?: unknown;
    myPokedexFilter?: unknown;
    displayName?: unknown;
    collapsePokedexAnswerFilters?: unknown;
    isAdmin?: unknown;
  };

  if (typeof payload.preventSpoilerMode !== 'boolean') return null;
  if (typeof payload.myPokedexFilter !== 'boolean') return null;
  if (typeof payload.displayName !== 'string') return null;
  if (typeof payload.collapsePokedexAnswerFilters !== 'boolean') return null;
  if (typeof payload.isAdmin !== 'boolean') return null;

  return {
    preventSpoilerMode: payload.preventSpoilerMode,
    myPokedexFilter: payload.myPokedexFilter,
    displayName: payload.displayName,
    collapsePokedexAnswerFilters: payload.collapsePokedexAnswerFilters,
    isAdmin: payload.isAdmin,
  };
}

export async function getRemoteSettings({
  token,
  apiBaseUrl,
}: {
  token: string;
  apiBaseUrl: string;
}): Promise<SettingsPayload | null> {
  const response = await fetch(`${normalizeApiBaseUrl(apiBaseUrl)}/settings`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) return null;
  const data = (await response.json()) as unknown;
  return parseSettingsFromApi(data);
}

export async function patchRemoteSettings({
  token,
  apiBaseUrl,
  patch,
}: {
  token: string;
  apiBaseUrl: string;
  patch: Partial<SettingsPayload>;
}): Promise<SettingsPayload | null> {
  const response = await fetch(`${normalizeApiBaseUrl(apiBaseUrl)}/settings`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(patch),
  });

  if (!response.ok) return null;
  const data = (await response.json()) as unknown;
  return parseSettingsFromApi(data);
}

function parseSaveBonusPuzzleResult(data: unknown): SaveBonusPuzzleResult | null {
  if (!data || typeof data !== 'object') return null;

  const payload = data as {
    date?: unknown;
    updatedTodayPuzzle?: unknown;
  };

  if (typeof payload.date !== 'string') return null;
  if (typeof payload.updatedTodayPuzzle !== 'boolean') return null;

  return {
    date: payload.date,
    updatedTodayPuzzle: payload.updatedTodayPuzzle,
  };
}

export async function saveAdminBonusPuzzle({
  token,
  apiBaseUrl,
  date,
  rowConstraints,
  colConstraints,
}: {
  token: string;
  apiBaseUrl: string;
  date: string;
  rowConstraints: PuzzleConstraintPayload[];
  colConstraints: PuzzleConstraintPayload[];
}): Promise<SaveBonusPuzzleResult | null> {
  const response = await fetch(`${normalizeApiBaseUrl(apiBaseUrl)}/admin/bonus-puzzle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      date,
      rowConstraints,
      colConstraints,
    }),
  });

  if (!response.ok) return null;
  const data = (await response.json()) as unknown;
  return parseSaveBonusPuzzleResult(data);
}

export function parseSharedUserDexFromApi(
  data: unknown,
  maxPrestigeLevelIndex = Number.POSITIVE_INFINITY
): SharedUserDexPayload | null {
  if (!data || typeof data !== 'object') return null;
  const payload = data as {
    userId?: unknown;
    displayName?: unknown;
    caughtPokemonKeyIds?: unknown;
    shinyPokemonKeyIds?: unknown;
    unlockedPrestigeLevelIndex?: unknown;
  };

  if (typeof payload.userId !== 'string' || payload.userId.trim().length === 0) return null;
  if (typeof payload.displayName !== 'string') return null;

  const userDex = parseUserDexFromApi(
    {
      caughtPokemonKeyIds: payload.caughtPokemonKeyIds,
      shinyPokemonKeyIds: payload.shinyPokemonKeyIds,
      unlockedPrestigeLevelIndex: payload.unlockedPrestigeLevelIndex,
    },
    maxPrestigeLevelIndex
  );
  if (!userDex) return null;

  return {
    userId: payload.userId,
    displayName: payload.displayName,
    ...userDex,
  };
}

export async function getSharedUserDex({
  apiBaseUrl,
  userId,
  maxPrestigeLevelIndex,
}: {
  apiBaseUrl: string;
  userId: string;
  maxPrestigeLevelIndex?: number;
}): Promise<{ data: SharedUserDexPayload | null; notFound: boolean }> {
  const encodedUserId = encodeURIComponent(userId);
  const response = await fetch(`${normalizeApiBaseUrl(apiBaseUrl)}/user-dex/${encodedUserId}`, {
    method: 'GET',
  });

  if (response.status === 404) {
    return { data: null, notFound: true };
  }
  if (!response.ok) {
    return { data: null, notFound: false };
  }

  const data = (await response.json()) as unknown;
  return {
    data: parseSharedUserDexFromApi(data, maxPrestigeLevelIndex),
    notFound: false,
  };
}
