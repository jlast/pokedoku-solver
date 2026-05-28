import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import type { Pokemon } from "@pokedoku-helper/shared-types";
import { POKEDOKU_FORM_ID_MAPPING } from "@pokedoku-helper/shared-types";
import {
  getRemoteSettings,
  getRemoteUserDex,
  patchRemoteSettings,
  patchRemoteUserDex,
} from "@pokedoku-helper/user-api-client";
import { PokedexImportPanel } from "../components/pokedex/PokedexImportPanel";
import { getPokemonKeyId } from "../lib/pokemonGrid";
import { getSessionUserProfile, getValidSessionIdToken } from "../../lib/cognitoAuth";
import { PRESTIGE_LEVELS } from "../../lib/prestigeLevels";

function getApiBaseUrl(): string | null {
  const baseUrl = import.meta.env.PUBLIC_USER_DEX_API_BASE_URL;
  if (!baseUrl || typeof baseUrl !== "string") return null;
  return baseUrl;
}

export function ProfileSettingsPageClient() {
  const profile = typeof window === "undefined" ? null : getSessionUserProfile();
  const isSignedIn = Boolean(profile);
  const [isLoading, setIsLoading] = useState(isSignedIn);
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [nicknameInput, setNicknameInput] = useState("");
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [nicknameStatus, setNicknameStatus] = useState<string | null>(null);
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showImportPanel, setShowImportPanel] = useState(true);
  const [unlockedPrestigeLevelIndex, setUnlockedPrestigeLevelIndex] = useState(0);

  useEffect(() => {
    if (!isSignedIn) return;

    let isCancelled = false;

    async function loadData() {
      setIsLoading(true);

      try {
        const token = await getValidSessionIdToken();
        const apiBaseUrl = getApiBaseUrl();
        if (!token || !apiBaseUrl) {
          if (!isCancelled) {
            setIsLoading(false);
          }
          return;
        }

        const [settingsResult, userDexResult, pokemonResult] = await Promise.allSettled([
          getRemoteSettings({ token, apiBaseUrl }),
          getRemoteUserDex({ token, apiBaseUrl, maxPrestigeLevelIndex: PRESTIGE_LEVELS.length - 1 }),
          fetch(`${import.meta.env.BASE_URL}data/pokemon.json?t=${Date.now()}`).then(async (response) => (await response.json()) as Pokemon[]),
        ]);

        if (isCancelled) return;

        if (settingsResult.status === "fulfilled") {
          setNicknameInput(settingsResult.value?.displayName ?? "");
        }

        if (userDexResult.status === "fulfilled") {
          setUnlockedPrestigeLevelIndex(userDexResult.value?.unlockedPrestigeLevelIndex ?? 0);
        }

        if (pokemonResult.status === "fulfilled") {
          setPokemon(Array.isArray(pokemonResult.value) ? pokemonResult.value : []);
        } else {
          setPokemon([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isCancelled = true;
    };
  }, [isSignedIn]);

  async function saveNickname() {
    setNicknameError(null);
    setNicknameStatus(null);

    const nextDisplayName = nicknameInput.trim();
    if (!nextDisplayName) {
      setNicknameError("Please enter a nickname.");
      return;
    }
    if (nextDisplayName.length > 40) {
      setNicknameError("Nickname must be 40 characters or fewer.");
      return;
    }

    const token = await getValidSessionIdToken();
    const apiBaseUrl = getApiBaseUrl();
    if (!token || !apiBaseUrl) {
      setNicknameError("Session expired. Please sign in again.");
      return;
    }

    setIsSavingNickname(true);
    const updated = await patchRemoteSettings({
      token,
      apiBaseUrl,
      patch: {
        displayName: nextDisplayName,
      },
    });
    setIsSavingNickname(false);

    if (!updated?.displayName.trim()) {
      setNicknameError("Could not save nickname. Please try again.");
      return;
    }

    setNicknameInput(updated.displayName);
    setNicknameStatus("Nickname saved.");
    window.dispatchEvent(
      new CustomEvent("user-display-name-updated", {
        detail: { displayName: updated.displayName },
      })
    );
  }

  async function applyImportedPokedexJson(rawJsonText: string, source: "paste" | "file") {
    try {
      const parsed = JSON.parse(rawJsonText) as {
        prestige?: unknown;
        entries?: Array<{ "@t"?: unknown; pokemonId?: unknown; shiny?: unknown }>;
      };

      const validIds = new Set(pokemon.map((entry) => getPokemonKeyId(entry)));
      const importedCaught = new Set<number>();
      const importedShiny = new Set<number>();
      let targetPrestigeLevelIndex = unlockedPrestigeLevelIndex;

      if (Array.isArray(parsed.entries)) {
        for (const entry of parsed.entries) {
          if (entry?.["@t"] !== "upd") continue;
          let pokemonId = Number(entry.pokemonId);
          if (POKEDOKU_FORM_ID_MAPPING[pokemonId]) {
            pokemonId = POKEDOKU_FORM_ID_MAPPING[pokemonId];
          }
          if (!Number.isFinite(pokemonId) || !validIds.has(pokemonId)) continue;
          importedCaught.add(pokemonId);
          if (entry.shiny === true) {
            importedShiny.add(pokemonId);
          }
        }
      }

      const importedPrestige = Number(parsed.prestige);
      if (Number.isFinite(importedPrestige)) {
        targetPrestigeLevelIndex = Math.max(0, Math.min(PRESTIGE_LEVELS.length - 1, Math.floor(importedPrestige)));
      }

      const token = await getValidSessionIdToken();
      const apiBaseUrl = getApiBaseUrl();
      if (!token || !apiBaseUrl) {
        setImportStatus("Session expired. Please sign in again.");
        return;
      }

      const didSave = await patchRemoteUserDex({
        token,
        apiBaseUrl,
        payload: {
          caughtPokemonKeyIds: Array.from(importedCaught).sort((a, b) => a - b),
          shinyPokemonKeyIds: Array.from(importedShiny).sort((a, b) => a - b),
          unlockedPrestigeLevelIndex: targetPrestigeLevelIndex,
          updatedAt: new Date().toISOString(),
        },
      });

      if (!didSave) {
        setImportStatus("Import failed while saving. Please try again.");
        return;
      }

      setUnlockedPrestigeLevelIndex(targetPrestigeLevelIndex);
      setImportStatus(
        `${source === "file" ? "Uploaded" : "Imported"} ${importedCaught.size} unlocked Pokemon and ${importedShiny.size} shinies.`,
      );
    } catch {
      setImportStatus(source === "file" ? "Upload failed. Please select valid JSON." : "Import failed. Please paste valid JSON.");
    }
  }

  function importPokedexJson() {
    void applyImportedPokedexJson(importJsonText, "paste");
  }

  function uploadPokedexJsonFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    void file
      .text()
      .then((text) => applyImportedPokedexJson(text, "file"))
      .catch(() => {
        setImportStatus("Upload failed. Please select valid JSON.");
      })
      .finally(() => {
        event.target.value = "";
      });
  }

  if (!profile) {
    return (
      <main className="mx-auto mt-4 w-full max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6 text-center shadow-sm">
        <h2 className="m-0 text-2xl font-semibold text-[var(--text-h)]">Sign in required</h2>
        <p className="mb-0 mt-3 text-[var(--text)]">Please sign in to manage your profile settings.</p>
        <a
          href={`${import.meta.env.BASE_URL}login/`}
          className="mt-5 inline-flex h-10 items-center rounded-[10px] border border-[var(--border)] bg-[var(--bg)] px-4 text-sm font-semibold text-[var(--text)] no-underline transition-colors hover:bg-[var(--code-bg)]"
        >
          Go to Login
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto mt-4 flex w-full max-w-4xl flex-col gap-4">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-sm">
        <p className="m-0 text-xs font-semibold tracking-wide text-[var(--text)] uppercase">Profile</p>
        <h2 className="m-0 mt-2 text-2xl font-semibold text-[var(--text-h)]">Nickname</h2>
        <p className="mb-0 mt-2 text-sm text-[var(--text)]">Choose the name shown on your shared profile and around your signed-in experience.</p>

        {isLoading ? (
          <p className="mb-0 mt-4 text-sm text-[var(--text)]">Loading your settings...</p>
        ) : (
          <>
            <label htmlFor="nickname" className="mt-4 block text-sm font-medium text-[var(--text)]">
              Nickname
            </label>
            <input
              id="nickname"
              type="text"
              value={nicknameInput}
              maxLength={40}
              onChange={(event) => {
                setNicknameInput(event.target.value);
                if (nicknameError) setNicknameError(null);
                if (nicknameStatus) setNicknameStatus(null);
              }}
              className="mt-2 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-h)] focus:border-[var(--accent)] focus:outline-none"
              placeholder="Enter a nickname"
            />
            <p className="m-0 mt-2 text-xs text-[var(--text)]">Any visible character is allowed. Maximum 40 characters.</p>
            {nicknameError ? <p className="m-0 mt-2 text-sm text-red-600">{nicknameError}</p> : null}
            {nicknameStatus ? <p className="m-0 mt-2 text-sm text-emerald-700 [html[data-theme='dark']_&]:text-emerald-300">{nicknameStatus}</p> : null}
            <button
              type="button"
              onClick={() => {
                void saveNickname();
              }}
              disabled={isSavingNickname}
              className="mt-4 inline-flex h-10 items-center rounded-[10px] border border-[var(--accent-border)] bg-[var(--accent)] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingNickname ? "Saving..." : "Save nickname"}
            </button>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-sm">
        <p className="m-0 text-xs font-semibold tracking-wide text-[var(--text)] uppercase">Pokedex</p>
        <h2 className="m-0 mt-2 text-2xl font-semibold text-[var(--text-h)]">Import Pokedoku progress</h2>
        <p className="mb-0 mt-2 text-sm text-[var(--text)]">
          Bring over your Pokedoku export here, then head back to
          {" "}
          <a
            href={`${import.meta.env.BASE_URL}user/pokedex/`}
            className="font-semibold text-[var(--text-h)] underline decoration-[var(--border)] underline-offset-2"
          >
            My Pokedex
          </a>
          {" "}
          to keep editing it.
        </p>
        <div className="mt-4">
          <PokedexImportPanel
            importJsonText={importJsonText}
            importStatus={importStatus}
            showImportPanel={showImportPanel}
            onTogglePanel={() => setShowImportPanel((prev) => !prev)}
            onImportTextChange={setImportJsonText}
            onImportClick={importPokedexJson}
            onUploadChange={uploadPokedexJsonFile}
          />
        </div>
      </section>
    </main>
  );
}
