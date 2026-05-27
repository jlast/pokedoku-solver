import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { Pokemon } from "@pokedoku-helper/shared-types";
import { getSessionUserProfile, getValidSessionIdToken } from "../../lib/cognitoAuth";
import { PRESTIGE_LEVELS } from "../../lib/prestigeLevels";
import { PokeballIcon } from "../components/shared/PokeballIcon";
import { POKEDOKU_FORM_ID_MAPPING } from "@pokedoku-helper/shared-types";
import {
  getRemoteUserDex,
  patchRemoteUserDex,
} from "@pokedoku-helper/user-api-client";
import { PokedexFilterToggle, type FilterMode } from "../components/pokedex/PokedexFilterToggle";
import { PokedexImportPanel } from "../components/pokedex/PokedexImportPanel";
import { PrestigeProgressCards } from "../components/pokedex/PrestigeProgressCards";
import { getPokemonKeyId } from "../lib/pokemonGrid";
import {
  INITIAL_RENDER_COUNT,
  RENDER_BATCH_SIZE,
  useIncrementalPokemonGrid,
} from "../lib/useIncrementalPokemonGrid";

function getApiBaseUrl(): string | null {
  const baseUrl = import.meta.env.PUBLIC_USER_DEX_API_BASE_URL;
  if (!baseUrl || typeof baseUrl !== "string") return null;
  return baseUrl;
}

export function MyPokedexPageClient() {
  const profile = typeof window === "undefined" ? null : getSessionUserProfile();
  const isSignedIn = Boolean(profile);
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [caughtSet, setCaughtSet] = useState<Set<number>>(new Set<number>());
  const [shinySet, setShinySet] = useState<Set<number>>(new Set<number>());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("missing");
  const [selectedPrestigeLevelId, setSelectedPrestigeLevelId] = useState(PRESTIGE_LEVELS[0]?.id ?? "pokeball");
  const [unlockedPrestigeLevelIndex, setUnlockedPrestigeLevelIndex] = useState(0);
  const [importJsonText, setImportJsonText] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(INITIAL_RENDER_COUNT);

  useEffect(() => {
    if (!isSignedIn) return;

    let isCancelled = false;

    async function loadData() {
      setIsLoading(true);

      try {
        const pokemonResponse = await fetch(`${import.meta.env.BASE_URL}data/pokemon.json?t=${Date.now()}`);
        const pokemonData = (await pokemonResponse.json()) as Pokemon[];

        if (!isCancelled) {
          setPokemon(Array.isArray(pokemonData) ? pokemonData : []);
        }
      } catch {
        if (!isCancelled) {
          setPokemon([]);
        }
      }

      const token = await getValidSessionIdToken();
      const apiBaseUrl = getApiBaseUrl();
      if (!token || !apiBaseUrl) {
        if (!isCancelled) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const remoteUserDex = await getRemoteUserDex({
          token,
          apiBaseUrl,
          maxPrestigeLevelIndex: PRESTIGE_LEVELS.length - 1,
        });

        if (remoteUserDex) {
          const remoteCaughtSet = new Set(remoteUserDex.caughtPokemonKeyIds);
          const remoteShinySet = new Set(remoteUserDex.shinyPokemonKeyIds);
          if (!isCancelled) {
            setCaughtSet(remoteCaughtSet);
            setShinySet(remoteShinySet);
            setUnlockedPrestigeLevelIndex(remoteUserDex.unlockedPrestigeLevelIndex);
            setSelectedPrestigeLevelId(PRESTIGE_LEVELS[remoteUserDex.unlockedPrestigeLevelIndex]?.id ?? PRESTIGE_LEVELS[0].id);
          }
        }
      } catch {}

      if (!isCancelled) {
        setIsLoading(false);
      }
    }

    void loadData();

    return () => {
      isCancelled = true;
    };
  }, [isSignedIn]);

  const caughtCount = caughtSet.size;
  const shinyCount = shinySet.size;
  const totalCount = pokemon.length;
  const selectedPrestigeLevel =
    PRESTIGE_LEVELS.find((level, index) => level.id === selectedPrestigeLevelId && index <= unlockedPrestigeLevelIndex) ??
    PRESTIGE_LEVELS[unlockedPrestigeLevelIndex] ??
    PRESTIGE_LEVELS[0];
  const selectedPrestigeLevelIndex = PRESTIGE_LEVELS.findIndex((level) => level.id === selectedPrestigeLevel.id);
  const isViewingPastPrestige = selectedPrestigeLevelIndex >= 0 && selectedPrestigeLevelIndex < unlockedPrestigeLevelIndex;
  const displayedCaughtCount = isViewingPastPrestige ? totalCount : caughtCount;
  const completionRate = totalCount > 0 ? (displayedCaughtCount / totalCount) * 100 : 0;
  const nextPrestigeLevel = PRESTIGE_LEVELS[unlockedPrestigeLevelIndex + 1] ?? null;
  const canUnlockNextPrestige = Boolean(nextPrestigeLevel) && totalCount > 0 && caughtCount === totalCount;

  const filteredPokemon = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const effectiveFilterMode = isViewingPastPrestige ? "all" : filterMode;

    return pokemon
      .filter((entry) => {
        const isCaught = caughtSet.has(getPokemonKeyId(entry));

        if (effectiveFilterMode === "caught" && !isCaught) {
          return false;
        }

        if (effectiveFilterMode === "missing" && isCaught) {
          return false;
        }

        if (!normalizedQuery) return true;

        return (
          entry.name.toLowerCase().includes(normalizedQuery) ||
          String(entry.id).includes(normalizedQuery) ||
          (entry.region ?? "").toLowerCase().includes(normalizedQuery) ||
          entry.types.some((type) => type.toLowerCase().includes(normalizedQuery))
        );
      })
      .sort((a, b) => a.id - b.id || getPokemonKeyId(a) - getPokemonKeyId(b));
  }, [caughtSet, filterMode, isViewingPastPrestige, pokemon, searchQuery]);
  const loadMoreRef = useIncrementalPokemonGrid(visibleCount < filteredPokemon.length, () => {
    setVisibleCount((currentCount) => Math.min(currentCount + RENDER_BATCH_SIZE, filteredPokemon.length));
  });
  const visiblePokemon = useMemo(() => filteredPokemon.slice(0, visibleCount), [filteredPokemon, visibleCount]);

  function resetVisiblePokemon() {
    setVisibleCount(INITIAL_RENDER_COUNT);
  }

  function unlockNextPrestigeLevel() {
    if (!nextPrestigeLevel || !canUnlockNextPrestige) return;

    const nextIndex = unlockedPrestigeLevelIndex + 1;
    resetVisiblePokemon();
    setUnlockedPrestigeLevelIndex(nextIndex);

    const resetCaughtSet = new Set<number>();
    const resetShinySet = new Set<number>();
    setCaughtSet(resetCaughtSet);
    setShinySet(resetShinySet);

    setSelectedPrestigeLevelId(nextPrestigeLevel.id);

    void (async () => {
      const token = await getValidSessionIdToken();
      const apiBaseUrl = getApiBaseUrl();
      if (token && apiBaseUrl) {
        await patchRemoteUserDex({
          token,
          apiBaseUrl,
          payload: {
            caughtPokemonKeyIds: [],
            shinyPokemonKeyIds: [],
            unlockedPrestigeLevelIndex: nextIndex,
          },
        });
      }
    })();
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
          if(POKEDOKU_FORM_ID_MAPPING[pokemonId]) {
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
        const levelIndex = Math.max(0, Math.min(PRESTIGE_LEVELS.length - 1, Math.floor(importedPrestige)));
        targetPrestigeLevelIndex = levelIndex;
        setUnlockedPrestigeLevelIndex(levelIndex);
        setSelectedPrestigeLevelId(PRESTIGE_LEVELS[levelIndex]?.id ?? PRESTIGE_LEVELS[0].id);
      }

      setCaughtSet(importedCaught);
      setShinySet(importedShiny);
      resetVisiblePokemon();
      setImportStatus(
        `${source === "file" ? "Uploaded" : "Imported"} ${importedCaught.size} unlocked Pokemon and ${importedShiny.size} shinies.`,
      );

      const token = await getValidSessionIdToken();
      const apiBaseUrl = getApiBaseUrl();
      if (!token || !apiBaseUrl) return;

      await patchRemoteUserDex({
        token,
        apiBaseUrl,
        payload: {
        caughtPokemonKeyIds: Array.from(importedCaught).sort((a, b) => a - b),
        shinyPokemonKeyIds: Array.from(importedShiny).sort((a, b) => a - b),
        unlockedPrestigeLevelIndex: targetPrestigeLevelIndex,
        },
      });
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
      .then((text) => {
        return applyImportedPokedexJson(text, "file");
      })
      .catch(() => {
        setImportStatus("Upload failed. Please select valid JSON.");
      })
      .finally(() => {
        event.target.value = "";
      });
  }

  async function toggleCaught(pokemonKeyId: number) {
    const nextSet = new Set(caughtSet);
    const nextShinySet = new Set(shinySet);
    if (nextSet.has(pokemonKeyId)) {
      nextSet.delete(pokemonKeyId);
      nextShinySet.delete(pokemonKeyId);
    } else {
      nextSet.add(pokemonKeyId);
    }

    setCaughtSet(nextSet);
    setShinySet(nextShinySet);
    if (filterMode !== "all") {
      resetVisiblePokemon();
    }

    const token = await getValidSessionIdToken();
    const apiBaseUrl = getApiBaseUrl();
    if (!token || !apiBaseUrl) return;

    await patchRemoteUserDex({
      token,
      apiBaseUrl,
      payload: {
      caughtPokemonKeyIds: Array.from(nextSet).sort((a, b) => a - b),
      shinyPokemonKeyIds: Array.from(nextShinySet).sort((a, b) => a - b),
      unlockedPrestigeLevelIndex,
      },
    });
  }


  function toggleShiny(pokemonKeyId: number) {
    if (!caughtSet.has(pokemonKeyId)) return;

    const nextSet = new Set(shinySet);
    if (nextSet.has(pokemonKeyId)) {
      nextSet.delete(pokemonKeyId);
    } else {
      nextSet.add(pokemonKeyId);
    }

    setShinySet(nextSet);

    void (async () => {
      const token = await getValidSessionIdToken();
      const apiBaseUrl = getApiBaseUrl();
      if (!token || !apiBaseUrl) return;

      await patchRemoteUserDex({
        token,
        apiBaseUrl,
        payload: {
          caughtPokemonKeyIds: Array.from(caughtSet).sort((a, b) => a - b),
          shinyPokemonKeyIds: Array.from(nextSet).sort((a, b) => a - b),
          unlockedPrestigeLevelIndex,
        },
      });
    })();
  }

  if (!profile) {
    return (
      <main className="mx-auto mt-4 w-full max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6 text-center shadow-sm">
        <h2 className="m-0 text-2xl font-semibold text-[var(--text-h)]">Sign in required</h2>
        <p className="mb-0 mt-3 text-[var(--text)]">
          Please sign in to view your personal Pokedex progress.
        </p>
        <a
          href={`${import.meta.env.BASE_URL}login/`}
          className="mt-5 inline-flex h-10 items-center rounded-[10px] bg-[var(--text-h)] px-4 text-sm font-semibold text-white no-underline transition-colors hover:bg-[var(--code-bg)]"
        >
          Go to Login
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto mt-4 flex w-full max-w-4xl flex-col gap-4">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-sm">
        <PokedexImportPanel
          importJsonText={importJsonText}
          importStatus={importStatus}
          showImportPanel={showImportPanel}
          onTogglePanel={() => setShowImportPanel((prev) => !prev)}
          onImportTextChange={setImportJsonText}
          onImportClick={importPokedexJson}
          onUploadChange={uploadPokedexJsonFile}
        />

        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 [html[data-theme='dark']_&]:border-amber-800/60 [html[data-theme='dark']_&]:bg-amber-900/40">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="m-0 text-sm font-semibold text-amber-900 [html[data-theme='dark']_&]:text-amber-100">Prestige Unlock</p>
              <p className="m-0 mt-1 text-xs text-amber-800 [html[data-theme='dark']_&]:text-amber-200">
                {nextPrestigeLevel
                  ? `Complete the full Pokedex to unlock ${nextPrestigeLevel.label}. Unlocking resets your progress.`
                  : "All prestige levels unlocked."}
              </p>
            </div>
            <button
              type="button"
              onClick={unlockNextPrestigeLevel}
              disabled={!canUnlockNextPrestige}
              className={`h-11 shrink-0 rounded-lg px-5 text-sm font-bold transition ${
                canUnlockNextPrestige
                  ? "bg-amber-500 text-white shadow-sm hover:bg-amber-600"
                  : "cursor-not-allowed bg-[var(--code-bg)] text-[var(--text)]"
              }`}
            >
              {nextPrestigeLevel ? `Unlock ${nextPrestigeLevel.label}` : "All unlocked"}
            </button>
          </div>
        </div>

        <div className="mb-4 overflow-x-auto pb-1">
          <div className="inline-flex min-w-full gap-2 rounded-xl bg-[var(--code-bg)] p-1">
            {PRESTIGE_LEVELS.map((level, levelIndex) => {
              const isLocked = levelIndex > unlockedPrestigeLevelIndex;
              const isSelected = selectedPrestigeLevel.id === level.id;

              return (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => setSelectedPrestigeLevelId(level.id)}
                  disabled={isLocked}
                  className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    isSelected
                      ? isViewingPastPrestige
                        ? "bg-amber-100 text-amber-900 shadow-sm"
                        : "bg-[var(--bg)] text-[var(--text-h)] shadow-sm"
                      : "text-[var(--text)] hover:bg-[var(--code-bg)] hover:text-[var(--text-h)]"
                  } ${isLocked ? "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-[var(--text)]" : ""}`}
                >
                  <PokeballIcon tone={level.tone} className="h-4 w-4" />
                  <span>{level.label}</span>
                  {isLocked ? <span className="text-[10px]">Locked</span> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="m-0 text-xl font-semibold text-[var(--text-h)]">My Pokedex</h2>
            <p className="mb-0 mt-1 text-sm text-[var(--text)]">Track your collection and keep your progress synced.</p>
          </div>
        </div>

        <div className="mt-4">
          <PrestigeProgressCards
            prestigeLevel={selectedPrestigeLevel}
            caughtCount={displayedCaughtCount}
            totalCount={totalCount}
            shinyCount={shinyCount}
            completionRate={completionRate}
            progressValue={displayedCaughtCount}
            isLoading={isLoading}
            viewOnlyNote={isViewingPastPrestige ? "Previous prestiges are view-only and fully unlocked." : undefined}
          />
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => {
              resetVisiblePokemon();
              setSearchQuery(event.target.value);
            }}
            placeholder="Search by name, number, type, or region"
            className="h-10 w-full rounded-lg border border-[var(--border)] px-3 text-sm text-[var(--text-h)] outline-none ring-slate-300 transition focus:ring"
          />
          {!isViewingPastPrestige ? (
            <PokedexFilterToggle
              filterMode={filterMode}
              onChange={(nextFilterMode) => {
                resetVisiblePokemon();
                setFilterMode(nextFilterMode);
              }}
            />
          ) : null}
        </div>

        {isLoading ? (
          <p className="mb-0 mt-5 text-sm text-[var(--text)]">Loading your Pokedex...</p>
        ) : (
          <>
          <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
            {visiblePokemon.map((entry) => {
              const pokemonKeyId = getPokemonKeyId(entry);
              const isCaught = isViewingPastPrestige ? true : caughtSet.has(pokemonKeyId);
              const isShiny = shinySet.has(pokemonKeyId);

              return (
                <button
                  key={pokemonKeyId}
                  type="button"
                  onClick={() => {
                    if (!isViewingPastPrestige) {
                      void toggleCaught(pokemonKeyId);
                    }
                  }}
                  disabled={isViewingPastPrestige}
                  className={`rounded-xl border p-3 text-left transition cursor-pointer  ${
                    isShiny ? 
                      "border-amber-300 bg-amber-50 [html[data-theme='dark']_&]:border-amber-800/60 [html[data-theme='dark']_&]:bg-amber-900/40"
                      : isCaught
                      ? isViewingPastPrestige
                        ? "border-amber-300 bg-amber-50 [html[data-theme='dark']_&]:border-amber-800/60 [html[data-theme='dark']_&]:bg-amber-900/40"
                        : "border-emerald-300 bg-emerald-50 hover:bg-emerald-100 [html[data-theme='dark']_&]:border-emerald-800/60 [html[data-theme='dark']_&]:bg-emerald-900/40 [html[data-theme='dark']_&]:hover:bg-emerald-800/45"
                      : isViewingPastPrestige
                        ? "border-[var(--border)] bg-[var(--bg)]"
                        : "border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--code-bg)]"
                  } ${isViewingPastPrestige ? "cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-[var(--text)]">#{entry.id}</span>
                    <span className={`text-xs font-semibold ${isCaught ? (isViewingPastPrestige ? "text-amber-700 [html[data-theme='dark']_&]:text-amber-300" : "text-emerald-700 [html[data-theme='dark']_&]:text-emerald-300") : "text-[var(--text)]"}`}>
                      {isCaught ? "Caught" : "Missing"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {entry.sprite ? (
                      <img src={entry.sprite} alt={entry.name} className="h-10 w-10 object-contain" loading="lazy" />
                    ) : (
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[var(--code-bg)] text-xs font-semibold text-[var(--text)]">
                        {entry.name.charAt(0)}
                      </span>
                    )}
                    <div>
                      <p className="m-0 text-sm font-semibold text-[var(--text-h)]">{entry.name}</p>
                      <p className="m-0 text-xs text-[var(--text)]">{entry.types.join(" / ")}</p>
                    </div>
                  </div>
                  {(!isViewingPastPrestige || isShiny) ? (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!isViewingPastPrestige) {
                            toggleShiny(pokemonKeyId);
                          }
                        }}
                        disabled={!isCaught || isViewingPastPrestige}
                        className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                          isShiny
                            ? "bg-amber-400 text-amber-900"
                            : isCaught
                              ? "cursor-pointer bg-[var(--code-bg)] text-[var(--text)] hover:bg-[var(--accent-bg)]"
                              : "cursor-not-allowed bg-[var(--code-bg)] text-[var(--text)]"
                        }`}
                      >
                        {isShiny ? "Shiny unlocked" : "Mark shiny"}
                      </button>
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
          {visibleCount < filteredPokemon.length ? <div ref={loadMoreRef} className="h-1 w-full" aria-hidden="true" /> : null}
          </>
        )}
      </section>
    </main>
  );
}
