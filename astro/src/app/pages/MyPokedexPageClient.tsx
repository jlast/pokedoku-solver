import { useEffect, useMemo, useRef, useState } from "react";
import type { Pokemon } from "@pokedoku-helper/shared-types";
import { getSessionUserProfile, getValidSessionIdToken } from "../../lib/cognitoAuth";
import { PRESTIGE_LEVELS } from "../../lib/prestigeLevels";
import { PokeballIcon } from "../components/shared/PokeballIcon";
import {
  getRemoteUserDex,
  patchRemoteUserDex,
} from "@pokedoku-helper/user-api-client";
import { PokedexFilterToggle, type FilterMode } from "../components/pokedex/PokedexFilterToggle";
import { PrestigeProgressCards } from "../components/pokedex/PrestigeProgressCards";
import { CategoryBadgeLink } from "../components/shared/CategoryBadgeLink";
import { parseCategoryId } from "../components/puzzle-stats/categoryUtils";
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

function getPrestigeSectionAuroraClass(tone: string): string {
  switch (tone) {
    case "greatball":
      return "prestige-aurora--greatball";
    case "ultraball":
      return "prestige-aurora--ultraball";
    case "masterball":
      return "prestige-aurora--masterball";
    case "premierball":
      return "prestige-aurora--premierball";
    case "beastball":
      return "prestige-aurora--beastball";
    case "cherishball":
      return "prestige-aurora--cherishball";
    case "pokeball":
    default:
      return "prestige-aurora--pokeball";
  }
}

export function MyPokedexPageClient() {
  const temporaryVisibleTimeoutsRef = useRef<Map<number, number>>(new Map());
  const profile = typeof window === "undefined" ? null : getSessionUserProfile();
  const isSignedIn = Boolean(profile);
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [caughtSet, setCaughtSet] = useState<Set<number>>(new Set<number>());
  const [shinySet, setShinySet] = useState<Set<number>>(new Set<number>());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("missing");
  const [temporarilyVisiblePokemonKeyIds, setTemporarilyVisiblePokemonKeyIds] = useState<Set<number>>(new Set<number>());
  const [selectedPrestigeLevelId, setSelectedPrestigeLevelId] = useState(PRESTIGE_LEVELS[0]?.id ?? "pokeball");
  const [unlockedPrestigeLevelIndex, setUnlockedPrestigeLevelIndex] = useState(0);
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

  useEffect(() => {
    const temporaryVisibleTimeouts = temporaryVisibleTimeoutsRef.current;

    return () => {
      temporaryVisibleTimeouts.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      temporaryVisibleTimeouts.clear();
    };
  }, []);

  const caughtCount = caughtSet.size;
  const totalCount = pokemon.length;
  const selectedPrestigeLevel =
    PRESTIGE_LEVELS.find((level, index) => level.id === selectedPrestigeLevelId && index <= unlockedPrestigeLevelIndex) ??
    PRESTIGE_LEVELS[unlockedPrestigeLevelIndex] ??
    PRESTIGE_LEVELS[0];
  const sectionAuroraClass = getPrestigeSectionAuroraClass(selectedPrestigeLevel.tone);
  const selectedPrestigeLevelIndex = PRESTIGE_LEVELS.findIndex((level) => level.id === selectedPrestigeLevel.id);
  const isViewingPastPrestige = selectedPrestigeLevelIndex >= 0 && selectedPrestigeLevelIndex < unlockedPrestigeLevelIndex;
  const displayedCaughtCount = isViewingPastPrestige ? totalCount : caughtCount;
  const remainingCount = Math.max(0, totalCount - displayedCaughtCount);
  const completionRate = totalCount > 0 ? (displayedCaughtCount / totalCount) * 100 : 0;
  const nextPrestigeLevel = PRESTIGE_LEVELS[unlockedPrestigeLevelIndex + 1] ?? null;
  const canUnlockNextPrestige = Boolean(nextPrestigeLevel) && totalCount > 0 && caughtCount === totalCount;
  const unlockProgressPercent = totalCount > 0 ? Math.max(0, Math.min(100, (caughtCount / totalCount) * 100)) : 0;

  const filteredPokemon = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const effectiveFilterMode = isViewingPastPrestige ? "all" : filterMode;

    return pokemon
      .filter((entry) => {
        const pokemonKeyId = getPokemonKeyId(entry);
        const isCaught = caughtSet.has(pokemonKeyId);

        const matchesSearch = !normalizedQuery ||
          entry.name.toLowerCase().includes(normalizedQuery) ||
          String(entry.id).includes(normalizedQuery) ||
          (entry.region ?? "").toLowerCase().includes(normalizedQuery) ||
          entry.types.some((type) => type.toLowerCase().includes(normalizedQuery));

        if (!matchesSearch) return false;

        if (temporarilyVisiblePokemonKeyIds.has(pokemonKeyId)) {
          return true;
        }

        if (effectiveFilterMode === "caught" && !isCaught) {
          return false;
        }

        if (effectiveFilterMode === "missing" && isCaught) {
          return false;
        }

        if (effectiveFilterMode === "shiny" && !shinySet.has(getPokemonKeyId(entry))) {
          return false;
        }

        return true;
      })
      .sort((a, b) => a.id - b.id || getPokemonKeyId(a) - getPokemonKeyId(b));
  }, [caughtSet, filterMode, isViewingPastPrestige, pokemon, searchQuery, shinySet, temporarilyVisiblePokemonKeyIds]);
  const loadMoreRef = useIncrementalPokemonGrid(visibleCount < filteredPokemon.length, () => {
    setVisibleCount((currentCount) => Math.min(currentCount + RENDER_BATCH_SIZE, filteredPokemon.length));
  });
  const visiblePokemon = useMemo(() => filteredPokemon.slice(0, visibleCount), [filteredPokemon, visibleCount]);

  function resetVisiblePokemon() {
    setVisibleCount(INITIAL_RENDER_COUNT);
  }

  function markPokemonTemporarilyVisible(pokemonKeyId: number) {
    const existingTimeoutId = temporaryVisibleTimeoutsRef.current.get(pokemonKeyId);
    if (existingTimeoutId) {
      window.clearTimeout(existingTimeoutId);
    }

    setTemporarilyVisiblePokemonKeyIds((currentSet) => new Set(currentSet).add(pokemonKeyId));

    const timeoutId = window.setTimeout(() => {
      setTemporarilyVisiblePokemonKeyIds((currentSet) => {
        const nextSet = new Set(currentSet);
        nextSet.delete(pokemonKeyId);
        return nextSet;
      });
      temporaryVisibleTimeoutsRef.current.delete(pokemonKeyId);
    }, 1800);

    temporaryVisibleTimeoutsRef.current.set(pokemonKeyId, timeoutId);
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
            updatedAt: new Date().toISOString(),
          },
        });
      }
    })();
  }

  async function toggleCaught(pokemonKeyId: number) {
    markPokemonTemporarilyVisible(pokemonKeyId);

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
        updatedAt: new Date().toISOString(),
      },
    });
  }


  function toggleShiny(pokemonKeyId: number) {
    if (!caughtSet.has(pokemonKeyId)) return;

    markPokemonTemporarilyVisible(pokemonKeyId);

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
          updatedAt: new Date().toISOString(),
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
          className="mt-5 inline-flex h-10 items-center rounded-[10px] border border-[var(--border)] bg-[var(--bg)] px-4 text-sm font-semibold text-[var(--text)] no-underline transition-colors hover:bg-[var(--code-bg)]"
        >
          Go to Login
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto mt-4 flex w-full max-w-4xl flex-col gap-4">
      <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-sm">
        <span
          aria-hidden="true"
          className={`prestige-aurora prestige-aurora-left ${sectionAuroraClass}`}
        />
        <span
          aria-hidden="true"
          className={`prestige-aurora prestige-aurora-right ${sectionAuroraClass}`}
        />
        <span
          aria-hidden="true"
          className={`prestige-aurora prestige-aurora-bottom ${sectionAuroraClass}`}
        />
        <span
          aria-hidden="true"
          className={`prestige-aurora prestige-aurora-sweep ${sectionAuroraClass}`}
        />
        <div className="relative z-10">
          <PrestigeProgressCards
            prestigeLevel={selectedPrestigeLevel}
            nextPrestigeLevel={nextPrestigeLevel}
            caughtCount={displayedCaughtCount}
            totalCount={totalCount}
            completionRate={completionRate}
            motivatingStat={isLoading ? undefined : `${remainingCount} Pokemon remaining`}
            progressValue={displayedCaughtCount}
            isLoading={isLoading}
            viewOnlyNote={isViewingPastPrestige ? "Previous prestiges are view-only and fully unlocked." : undefined}
          />
        </div>

        <div className="relative z-10 mt-4 overflow-x-auto pb-1">
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
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 [html[data-theme='dark']_&]:border-amber-800/60 [html[data-theme='dark']_&]:bg-amber-900/40">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="m-0 text-sm font-semibold text-amber-900 [html[data-theme='dark']_&]:text-amber-100">Prestige Unlock</p>
              <p className="m-0 mt-1 text-xs text-amber-800 [html[data-theme='dark']_&]:text-amber-200">
                {nextPrestigeLevel
                  ? `${remainingCount} Pokemon remaining to unlock ${nextPrestigeLevel.label}. Unlocking resets your progress.`
                  : "All prestige levels unlocked."}
              </p>
            </div>
            <button
              type="button"
              onClick={unlockNextPrestigeLevel}
              disabled={!canUnlockNextPrestige}
              className={`relative h-11 shrink-0 overflow-hidden rounded-lg px-5 text-sm font-bold transition ${
                canUnlockNextPrestige
                  ? "bg-amber-500 text-white shadow-sm hover:bg-amber-600"
                  : "cursor-not-allowed bg-[var(--code-bg)] text-[var(--text)]"
              }`}
            >
              {!canUnlockNextPrestige && nextPrestigeLevel ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 bg-amber-400/60 [html[data-theme='dark']_&]:bg-amber-500/35"
                  style={{ width: `${unlockProgressPercent}%` }}
                />
              ) : null}
              <span className="relative z-10 inline-flex items-center gap-2">
                {nextPrestigeLevel ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                    <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                ) : null}
                <span>{nextPrestigeLevel ? `Unlock ${nextPrestigeLevel.label}` : "All unlocked"}</span>
              </span>
            </button>
          </div>
        </div>

        <div className="relative z-10 mt-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative w-full">
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text)]"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
              <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => {
                resetVisiblePokemon();
                setSearchQuery(event.target.value);
              }}
              placeholder="Search by name, number, type, or region"
              className="h-10 w-full rounded-lg border border-[var(--border)] pl-9 pr-3 text-sm text-[var(--text-h)] outline-none ring-slate-300 transition focus:ring"
            />
          </div>
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
          <div className="relative z-10 mt-5 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
            {visiblePokemon.map((entry) => {
              const pokemonKeyId = getPokemonKeyId(entry);
              const isCaught = isViewingPastPrestige ? true : caughtSet.has(pokemonKeyId);
              const isShiny = shinySet.has(pokemonKeyId);
              const displaySprite = isShiny ? entry.shinySprite ?? entry.sprite : entry.sprite;

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
                  className={`flex h-full flex-col justify-start cursor-pointer rounded-xl border px-3 py-2.5 text-left transition ${
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
                  <div>
                    <p className="m-0 text-sm font-bold leading-tight text-[var(--text-h)]">
                      <span className="text-xs font-semibold text-[var(--text)]">#{entry.id}</span>
                      {" "}
                      {entry.name}
                    </p>
                  </div>

                  <div className="mt-2 flex justify-center">
                    {displaySprite ? (
                      <img src={displaySprite} alt={entry.name} className="h-12 w-12 shrink-0 object-contain" loading="lazy" />
                    ) : (
                      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--code-bg)] text-sm font-semibold text-[var(--text)]">
                        {entry.name.charAt(0)}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap justify-center gap-1">
                    {entry.types.map((type) => (
                      <CategoryBadgeLink
                        key={`${pokemonKeyId}-${type}`}
                        parsed={parseCategoryId(`types:${type}`)}
                        href={null}
                      />
                    ))}
                  </div>

                  {isCaught && (!isViewingPastPrestige || isShiny) ? (
                    <div className="mt-2 flex justify-center">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!isViewingPastPrestige) {
                            toggleShiny(pokemonKeyId);
                          }
                        }}
                        disabled={!isCaught || isViewingPastPrestige}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                          isShiny
                            ? "bg-amber-400 text-amber-900"
                            : isCaught
                              ? "cursor-pointer border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 [html[data-theme='dark']_&]:border-amber-800/60 [html[data-theme='dark']_&]:bg-amber-900/30 [html[data-theme='dark']_&]:text-amber-200 [html[data-theme='dark']_&]:hover:bg-amber-900/45"
                              : "cursor-not-allowed bg-[var(--code-bg)] text-[var(--text)] opacity-60"
                        }`}
                      >
                        <span aria-hidden="true">✨</span>
                        <span>{isShiny ? "Shiny" : "Mark shiny"}</span>
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
