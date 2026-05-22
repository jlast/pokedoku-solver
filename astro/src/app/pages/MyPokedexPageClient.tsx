import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { Pokemon } from "@pokedoku-helper/shared-types";
import { getSessionUserProfile, getValidSessionIdToken } from "../../lib/cognitoAuth";
import { PRESTIGE_LEVELS } from "../../lib/prestigeLevels";
import { getPrestigeUiTone } from "../lib/prestigeUi";
import { POKEDOKU_FORM_ID_MAPPING } from "@pokedoku-helper/shared-types";
import {
  getRemoteUserDex,
  patchRemoteUserDex,
} from "@pokedoku-helper/user-api-client";
import { PokedexImportPanel } from "../components/pokedex/PokedexImportPanel";

function PrestigeIcon({ tone, className }: { tone: string; className?: string }) {
  const toneClass = getPrestigeUiTone(tone).iconText;

  return (
    <svg className={`${toneClass} ${className ?? ""}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="rgb(30 41 59)" strokeWidth="1.35" />
      <path d="M3 12h18" stroke="rgb(30 41 59)" strokeWidth="1.35" strokeLinecap="round" />
      <path d="M5.2 12a6.8 6.8 0 0 1 13.6 0" className="fill-current" />
      <path d="M5.2 12a6.8 6.8 0 0 0 13.6 0" fill={tone === "cherishball" ? "currentColor" : "white"} />
      <circle cx="12" cy="12" r="2.5" fill="white" stroke="rgb(30 41 59)" strokeWidth="1.1" />
    </svg>
  );
}

function getPokemonKeyId(pokemon: Pokemon): number {
  return pokemon.formId ?? pokemon.id;
}


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
  const [showCaughtOnly, setShowCaughtOnly] = useState(false);
  const [showMissingOnly, setShowMissingOnly] = useState(true);
  const [selectedPrestigeLevelId, setSelectedPrestigeLevelId] = useState(PRESTIGE_LEVELS[0]?.id ?? "pokeball");
  const [unlockedPrestigeLevelIndex, setUnlockedPrestigeLevelIndex] = useState(0);
  const [importJsonText, setImportJsonText] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  const filteredPokemon = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return pokemon
      .filter((entry) => {
        if (showCaughtOnly && !caughtSet.has(getPokemonKeyId(entry))) {
          return false;
        }

        if (showMissingOnly && caughtSet.has(getPokemonKeyId(entry))) {
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
  }, [caughtSet, pokemon, searchQuery, showCaughtOnly, showMissingOnly]);

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
  const completionRate = totalCount > 0 ? Math.round((displayedCaughtCount / totalCount) * 100) : 0;
  const nextPrestigeLevel = PRESTIGE_LEVELS[unlockedPrestigeLevelIndex + 1] ?? null;
  const canUnlockNextPrestige = Boolean(nextPrestigeLevel) && totalCount > 0 && caughtCount === totalCount;
  const prestigeUiTone = getPrestigeUiTone(selectedPrestigeLevel.tone);

  function unlockNextPrestigeLevel() {
    if (!nextPrestigeLevel || !canUnlockNextPrestige) return;

    const nextIndex = unlockedPrestigeLevelIndex + 1;
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
      <main className="mx-auto mt-4 w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h2 className="m-0 text-2xl font-semibold text-slate-900">Sign in required</h2>
        <p className="mb-0 mt-3 text-slate-600">
          Please sign in to view your personal Pokedex progress.
        </p>
        <a
          href={`${import.meta.env.BASE_URL}login/`}
          className="mt-5 inline-flex h-10 items-center rounded-[10px] bg-slate-900 px-4 text-sm font-semibold text-white no-underline transition-colors hover:bg-slate-800"
        >
          Go to Login
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto mt-4 flex w-full max-w-4xl flex-col gap-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <PokedexImportPanel
          importJsonText={importJsonText}
          importStatus={importStatus}
          showImportPanel={showImportPanel}
          onTogglePanel={() => setShowImportPanel((prev) => !prev)}
          onImportTextChange={setImportJsonText}
          onImportClick={importPokedexJson}
          onUploadChange={uploadPokedexJsonFile}
        />

        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="m-0 text-sm font-semibold text-amber-900">Prestige Unlock</p>
              <p className="m-0 mt-1 text-xs text-amber-800">
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
                  : "cursor-not-allowed bg-slate-200 text-slate-500"
              }`}
            >
              {nextPrestigeLevel ? `Unlock ${nextPrestigeLevel.label}` : "All unlocked"}
            </button>
          </div>
        </div>

        <div className="mb-4 overflow-x-auto pb-1">
          <div className="inline-flex min-w-full gap-2 rounded-xl bg-slate-100 p-1">
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
                        : "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:bg-slate-200 hover:text-slate-800"
                  } ${isLocked ? "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-slate-600" : ""}`}
                >
                  <PrestigeIcon tone={level.tone} className="h-4 w-4" />
                  <span>{level.label}</span>
                  {isLocked ? <span className="text-[10px]">Locked</span> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="m-0 text-xl font-semibold text-slate-900">My Pokedex</h2>
            <p className="mb-0 mt-1 text-sm text-slate-500">Track your collection and keep your progress synced.</p>
            <div className={`mt-2 inline-flex items-center gap-3 rounded-xl border px-3 py-2 ${prestigeUiTone.bannerBg} ${prestigeUiTone.bannerBorder}`}>
              <PrestigeIcon tone={selectedPrestigeLevel.tone} className="h-5 w-5" />
              <div>
                <p className={`m-0 text-[11px] font-semibold uppercase tracking-wide ${prestigeUiTone.bannerLabelText}`}>Current Prestige</p>
                <p className={`m-0 text-base font-bold ${prestigeUiTone.bannerTitleText}`}>{selectedPrestigeLevel.label}</p>
                <p className={`m-0 text-xs font-medium ${prestigeUiTone.bannerOddsText}`}>Shiny odds: {selectedPrestigeLevel.oddsLabel}</p>
              </div>
            </div>
            {isViewingPastPrestige ? (
              <p className="mb-0 mt-1 text-xs font-semibold text-amber-700">Previous prestiges are view-only and fully unlocked.</p>
            ) : null}
          </div>
        </div>

        <div className={`mt-4 rounded-xl border p-4 ${prestigeUiTone.completionBg} ${prestigeUiTone.completionBorder}`}>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className={`m-0 text-sm ${prestigeUiTone.completionLabelText}`}>Completion</p>
              {isLoading ? (
                <>
                  <span className="mt-1 block h-7 w-24 animate-pulse rounded bg-slate-200" aria-hidden="true" />
                  <span className="mt-2 block h-3 w-16 animate-pulse rounded bg-slate-200" aria-hidden="true" />
                </>
              ) : (
                <>
                  <p className={`m-0 text-2xl font-bold ${prestigeUiTone.completionValueText}`}>
                    {displayedCaughtCount} / {totalCount}
                  </p>
                  <p className={`m-0 mt-1 text-xs font-semibold ${prestigeUiTone.completionMetaText}`}>Shinies: {shinyCount}</p>
                </>
              )}
            </div>
            {isLoading ? (
              <span className="block h-5 w-10 animate-pulse rounded bg-slate-200" aria-hidden="true" />
            ) : (
              <p className={`m-0 text-sm font-semibold ${prestigeUiTone.completionPercentText}`}>{completionRate}%</p>
            )}
          </div>
          {isLoading ? (
            <span className="mt-3 block h-2 w-full animate-pulse rounded-full bg-slate-200" aria-hidden="true" />
          ) : (
            <progress className={`mt-3 h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-white/70 [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:rounded-full ${prestigeUiTone.progressValueClass}`} max={Math.max(totalCount, 1)} value={displayedCaughtCount} />
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by name, number, type, or region"
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none ring-slate-300 transition focus:ring"
          />
          <button
            type="button"
            onClick={() => {
              setShowCaughtOnly((prev) => {
                const next = !prev;
                if (next) {
                  setShowMissingOnly(false);
                }
                return next;
              });
            }}
            className={`h-10 shrink-0 rounded-lg px-4 text-sm font-semibold transition ${
              showCaughtOnly ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {showCaughtOnly ? "Showing caught" : "Show caught only"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowMissingOnly((prev) => {
                const next = !prev;
                if (next) {
                  setShowCaughtOnly(false);
                }
                return next;
              });
            }}
            className={`h-10 shrink-0 rounded-lg px-4 text-sm font-semibold transition ${
              showMissingOnly ? "bg-slate-900 text-white hover:bg-slate-800" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {showMissingOnly ? "Showing missing" : "Show missing only"}
          </button>
        </div>

        {isLoading ? (
          <p className="mb-0 mt-5 text-sm text-slate-600">Loading your Pokedex...</p>
        ) : (
          <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
            {filteredPokemon.map((entry) => {
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
                  className={`rounded-xl border p-3 text-left transition ${
                    isCaught
                      ? isViewingPastPrestige
                        ? "border-amber-300 bg-amber-50"
                        : "border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
                      : isViewingPastPrestige
                        ? "border-slate-200 bg-white"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                  } ${isViewingPastPrestige ? "cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">#{entry.id}</span>
                    <span className={`text-xs font-semibold ${isCaught ? (isViewingPastPrestige ? "text-amber-700" : "text-emerald-700") : "text-slate-500"}`}>
                      {isCaught ? "Caught" : "Missing"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {entry.sprite ? (
                      <img src={entry.sprite} alt={entry.name} className="h-10 w-10 object-contain" loading="lazy" />
                    ) : (
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-slate-200 text-xs font-semibold text-slate-600">
                        {entry.name.charAt(0)}
                      </span>
                    )}
                    <div>
                      <p className="m-0 text-sm font-semibold text-slate-900">{entry.name}</p>
                      <p className="m-0 text-xs text-slate-500">{entry.types.join(" / ")}</p>
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
                              ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                              : "cursor-not-allowed bg-slate-100 text-slate-400"
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
        )}
      </section>
    </main>
  );
}
