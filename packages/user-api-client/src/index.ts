export type SavedBoardConstraint = {
  category: string;
  value: string;
};

export type SavedBoardPayload = {
  boardKey: string;
  rowConstraints: SavedBoardConstraint[];
  colConstraints: SavedBoardConstraint[];
  cells: (number | null)[][];
  savedAt: string;
};

export type UserDexPayload = {
  caughtPokemonKeyIds: number[];
  shinyPokemonKeyIds: number[];
  unlockedPrestigeLevelIndex: number;
  updatedAt: string | null;
  savedBoard?: SavedBoardPayload | null;
};

export type SettingsPayload = {
  preventSpoilerMode: boolean;
  myPokedexFilter: boolean;
  displayName: string;
  collapsePokedexAnswerFilters: boolean;
};

export type SharedUserDexPayload = UserDexPayload & {
  userId: string;
  displayName: string;
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
    savedBoard?: unknown;
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

  const savedBoard = parseSavedBoardFromApi(payload.savedBoard);

  return { caughtPokemonKeyIds, shinyPokemonKeyIds, unlockedPrestigeLevelIndex, updatedAt, savedBoard };
}

function parseSavedBoardConstraintFromApi(data: unknown): SavedBoardConstraint | null {
  if (!data || typeof data !== 'object') return null;

  const constraint = data as {
    category?: unknown;
    value?: unknown;
  };

  if (typeof constraint.category !== 'string' || constraint.category.trim().length === 0) return null;
  if (typeof constraint.value !== 'string' || constraint.value.trim().length === 0) return null;

  return {
    category: constraint.category,
    value: constraint.value,
  };
}

export function parseSavedBoardFromApi(data: unknown): SavedBoardPayload | null {
  if (!data || typeof data !== 'object') return null;

  const payload = data as {
    boardKey?: unknown;
    rowConstraints?: unknown;
    colConstraints?: unknown;
    cells?: unknown;
    savedAt?: unknown;
  };

  if (typeof payload.boardKey !== 'string' || payload.boardKey.trim().length === 0) return null;
  if (!Array.isArray(payload.rowConstraints) || !Array.isArray(payload.colConstraints) || !Array.isArray(payload.cells)) {
    return null;
  }

  const rowConstraints = payload.rowConstraints.map(parseSavedBoardConstraintFromApi);
  const colConstraints = payload.colConstraints.map(parseSavedBoardConstraintFromApi);
  if (rowConstraints.some((constraint) => constraint === null) || colConstraints.some((constraint) => constraint === null)) {
    return null;
  }

  const gridHeight = rowConstraints.length;
  const gridWidth = colConstraints.length;
  if (gridHeight === 0 || gridWidth === 0 || gridHeight > 9 || gridWidth > 9) return null;
  if (payload.cells.length !== gridHeight) return null;

  const cells = payload.cells.map((row) => {
    if (!Array.isArray(row) || row.length !== gridWidth) return null;
    return row.map((cell) => {
      if (cell === null) return null;
      const parsed = Number(cell);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    });
  });

  if (cells.some((row) => row === null)) return null;
  if (typeof payload.savedAt !== 'string' || payload.savedAt.trim().length === 0 || Number.isNaN(Date.parse(payload.savedAt))) {
    return null;
  }

  return {
    boardKey: payload.boardKey,
    rowConstraints: rowConstraints as SavedBoardConstraint[],
    colConstraints: colConstraints as SavedBoardConstraint[],
    cells: cells as (number | null)[][],
    savedAt: payload.savedAt,
  };
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
  };

  if (typeof payload.preventSpoilerMode !== 'boolean') return null;
  if (typeof payload.myPokedexFilter !== 'boolean') return null;
  if (typeof payload.displayName !== 'string') return null;
  if (typeof payload.collapsePokedexAnswerFilters !== 'boolean') return null;

  return {
    preventSpoilerMode: payload.preventSpoilerMode,
    myPokedexFilter: payload.myPokedexFilter,
    displayName: payload.displayName,
    collapsePokedexAnswerFilters: payload.collapsePokedexAnswerFilters,
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
