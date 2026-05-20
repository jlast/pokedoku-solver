export type UserDexPayload = {
  caughtPokemonKeyIds: number[];
  shinyPokemonKeyIds: number[];
  unlockedPrestigeLevelIndex: number;
};

function normalizeApiBaseUrl(apiBaseUrl: string): string {
  return apiBaseUrl.replace(/\/+$/, '');
}

export function parseUserDexFromApi(
  data: unknown,
  maxPrestigeLevelIndex = Number.POSITIVE_INFINITY,
): UserDexPayload | null {
  if (!data || typeof data !== 'object') return null;
  const payload = data as {
    caughtPokemonKeyIds?: unknown;
    shinyPokemonKeyIds?: unknown;
    unlockedPrestigeLevelIndex?: unknown;
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

  return { caughtPokemonKeyIds, shinyPokemonKeyIds, unlockedPrestigeLevelIndex };
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
