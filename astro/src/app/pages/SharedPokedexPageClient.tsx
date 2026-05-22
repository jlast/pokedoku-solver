import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { Pokemon } from "@pokedoku-helper/shared-types";
import { getSharedUserDex, type SharedUserDexPayload } from "@pokedoku-helper/user-api-client";
import { PRESTIGE_LEVELS } from "../../lib/prestigeLevels";
import { getPrestigeUiTone } from "../lib/prestigeUi";
import { PokeballIcon } from "../components/shared/PokeballIcon";

function getApiBaseUrl(): string | null {
  const baseUrl = import.meta.env.PUBLIC_USER_DEX_API_BASE_URL;
  if (!baseUrl || typeof baseUrl !== "string") return null;
  return baseUrl;
}

function getPokemonKeyId(pokemon: Pokemon): number {
  return pokemon.formId ?? pokemon.id;
}


export function SharedPokedexPageClient({ userId }: { userId?: string }) {
  const [resolvedUserId] = useState(() => {
    if (userId && userId.trim().length > 0) {
      return userId.trim();
    }
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("id")?.trim() ?? "";
  });
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [sharedUserDex, setSharedUserDex] = useState<SharedUserDexPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCaughtOnly, setShowCaughtOnly] = useState(false);
  const [showMissingOnly, setShowMissingOnly] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      setIsLoading(true);
      setIsNotFound(false);

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

      try {
        const apiBaseUrl = getApiBaseUrl();
        if (!apiBaseUrl || !resolvedUserId) {
          if (!isCancelled) {
            setSharedUserDex(null);
            setIsNotFound(true);
            setIsLoading(false);
          }
          return;
        }

        const result = await getSharedUserDex({
          apiBaseUrl,
          userId: resolvedUserId,
          maxPrestigeLevelIndex: PRESTIGE_LEVELS.length - 1,
        });

        if (!isCancelled) {
          setSharedUserDex(result.data);
          setIsNotFound(result.notFound || !result.data);
        }
      } catch {
        if (!isCancelled) {
          setSharedUserDex(null);
          setIsNotFound(true);
        }
      }

      if (!isCancelled) {
        setIsLoading(false);
      }
    }

    void loadData();

    return () => {
      isCancelled = true;
    };
  }, [resolvedUserId]);

  const caughtSet = useMemo(() => new Set(sharedUserDex?.caughtPokemonKeyIds ?? []), [sharedUserDex]);
  const shinySet = useMemo(() => new Set(sharedUserDex?.shinyPokemonKeyIds ?? []), [sharedUserDex]);
  const unlockedPrestigeLevelIndex = sharedUserDex?.unlockedPrestigeLevelIndex ?? 0;
  const displayName = sharedUserDex?.displayName.trim() ? sharedUserDex.displayName.trim() : "Unnamed trainer";

  const filteredPokemon = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return pokemon
      .filter((entry) => {
        const pokemonKeyId = getPokemonKeyId(entry);
        if (showCaughtOnly && !caughtSet.has(pokemonKeyId)) {
          return false;
        }
        if (showMissingOnly && caughtSet.has(pokemonKeyId)) {
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
  const completionRate = totalCount > 0 ? Math.round((caughtCount / totalCount) * 100) : 0;
  const selectedPrestigeLevel =
    PRESTIGE_LEVELS[unlockedPrestigeLevelIndex] ?? PRESTIGE_LEVELS[0];
  const prestigeUiTone = getPrestigeUiTone(selectedPrestigeLevel.tone);

  if (isLoading) {
    return (
      <main className="mx-auto mt-4 flex w-full max-w-4xl flex-col gap-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="m-0 text-sm text-slate-600">Loading shared Pokedex...</p>
        </section>
      </main>
    );
  }

  if (isNotFound) {
    return (
      <main className="mx-auto mt-4 flex w-full max-w-4xl flex-col gap-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="m-0 text-xl font-semibold text-slate-900">Pokedex not found</h2>
          <p className="mb-0 mt-2 text-sm text-slate-600">
            This trainer has not shared a Pokedex yet, or the link is invalid.
          </p>
          <a
            href={`${import.meta.env.BASE_URL}`}
            className="mt-4 inline-flex h-10 items-center rounded-[10px] bg-slate-900 px-4 text-sm font-semibold text-white no-underline transition-colors hover:bg-slate-800"
          >
            Go to homepage
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto mt-4 flex w-full max-w-4xl flex-col gap-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="m-0 mt-2 flex items-center gap-2 text-2xl font-semibold text-slate-900">
          <img
            src={`${import.meta.env.BASE_URL}images/content/trainer.png`}
            alt="Trainer"
            className="h-8 w-8"
          />
          <span>{displayName}</span>
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <div className={`rounded-xl border p-4 md:col-span-3 ${prestigeUiTone.completionBg} ${prestigeUiTone.completionBorder}`}>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className={`m-0 text-sm ${prestigeUiTone.completionLabelText}`}>Completion</p>
                <p className={`m-0 text-2xl font-bold ${prestigeUiTone.completionValueText}`}>{caughtCount} / {totalCount}</p>
                <p className={`m-0 mt-1 text-xs font-semibold ${prestigeUiTone.completionMetaText}`}>Shinies: {shinyCount}</p>
              </div>
              <p className={`m-0 text-sm font-semibold ${prestigeUiTone.completionPercentText}`}>{completionRate}%</p>
            </div>
            <progress className={`mt-3 h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-white/70 [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:rounded-full ${prestigeUiTone.progressValueClass}`} max={Math.max(totalCount, 1)} value={caughtCount} />
          </div>

          <div className={`flex items-center gap-3 rounded-xl border p-3 md:col-span-1 ${prestigeUiTone.bannerBg} ${prestigeUiTone.bannerBorder}`}>
            <PokeballIcon tone={selectedPrestigeLevel.tone} className="h-6 w-6" />
            <div>
              <p className={`m-0 text-[11px] font-semibold uppercase tracking-wide ${prestigeUiTone.bannerLabelText}`}>Current Prestige</p>
              <p className={`m-0 text-base font-bold ${prestigeUiTone.bannerTitleText}`}>{selectedPrestigeLevel.label}</p>
              <p className={`m-0 text-xs font-medium ${prestigeUiTone.bannerOddsText}`}>Shiny odds: {selectedPrestigeLevel.oddsLabel}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={searchQuery}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchQuery(event.target.value)}
            placeholder="Search by name, number, type, or region"
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none ring-slate-300 transition focus:ring"
          />
          <button
            type="button"
            onClick={() => {
              setShowCaughtOnly((prev) => {
                const next = !prev;
                if (next) setShowMissingOnly(false);
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
                if (next) setShowCaughtOnly(false);
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

        <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {filteredPokemon.map((entry) => {
            const pokemonKeyId = getPokemonKeyId(entry);
            const isCaught = caughtSet.has(pokemonKeyId);
            const isShiny = shinySet.has(pokemonKeyId);

            return (
              <article
                key={pokemonKeyId}
                className={`rounded-xl border p-3 ${
                  isCaught ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">#{entry.id}</span>
                  <span className={`text-xs font-semibold ${isCaught ? "text-emerald-700" : "text-slate-500"}`}>
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
                {isShiny ? (
                  <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                    <PokeballIcon tone="ultraball" className="h-3.5 w-3.5" />
                    Shiny
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
