import { getRemoteSettings, getRemoteUserDex, patchRemoteSettings, patchRemoteUserDex, type UserDexPayload } from '@pokedoku-helper/user-api-client';

export interface LoadedPokedexSettingsState {
  userDex: UserDexPayload | null;
  myPokedexFilter: boolean | null;
  spoilerModeEnabled: boolean | null;
}

export function getApiBaseUrl(): string | null {
  const baseUrl = import.meta.env.PUBLIC_USER_DEX_API_BASE_URL;
  if (!baseUrl || typeof baseUrl !== 'string') return null;
  return baseUrl;
}

export async function loadPokedexSettingsState(token: string, apiBaseUrl: string): Promise<LoadedPokedexSettingsState> {
  const [userDex, settings] = await Promise.all([
    getRemoteUserDex({ token, apiBaseUrl }),
    getRemoteSettings({ token, apiBaseUrl }),
  ]);

  return {
    userDex,
    myPokedexFilter: settings?.myPokedexFilter ?? null,
    spoilerModeEnabled: settings ? !settings.preventSpoilerMode : null,
  };
}

export async function saveMyPokedexFilterPreference(
  token: string,
  apiBaseUrl: string,
  myPokedexFilter: boolean,
): Promise<boolean> {
  return Boolean(
    await patchRemoteSettings({
      token,
      apiBaseUrl,
      patch: { myPokedexFilter },
    }),
  );
}

export async function saveCaughtPokemonPayload(token: string, apiBaseUrl: string, payload: UserDexPayload): Promise<boolean> {
  return Boolean(
    await patchRemoteUserDex({
      token,
      apiBaseUrl,
      payload,
    }),
  );
}

export async function saveSpoilerModePreference(token: string, apiBaseUrl: string, spoilerModeEnabled: boolean): Promise<boolean> {
  return Boolean(
    await patchRemoteSettings({
      token,
      apiBaseUrl,
      patch: { preventSpoilerMode: !spoilerModeEnabled },
    }),
  );
}
