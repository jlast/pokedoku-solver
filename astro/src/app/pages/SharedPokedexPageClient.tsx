import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { Pokemon } from "@pokedoku-helper/shared-types";
import { getSharedUserDex, type SharedUserDexPayload } from "@pokedoku-helper/user-api-client";
import { PRESTIGE_LEVELS } from "../../lib/prestigeLevels";
import { PokedexFilterToggle, type FilterMode } from "../components/pokedex/PokedexFilterToggle";
import { PrestigeProgressCards } from "../components/pokedex/PrestigeProgressCards";
import { PokeballIcon } from "../components/shared/PokeballIcon";
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
  const [filterMode, setFilterMode] = useState<FilterMode>("missing");
  const [visibleCount, setVisibleCount] = useState(INITIAL_RENDER_COUNT);

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
        if (filterMode === "caught" && !caughtSet.has(pokemonKeyId)) {
          return false;
        }
        if (filterMode === "missing" && caughtSet.has(pokemonKeyId)) {
          return false;
        }
        if (filterMode === "shiny" && !shinySet.has(pokemonKeyId)) {
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
  }, [caughtSet, filterMode, pokemon, searchQuery, shinySet]);
  const loadMoreRef = useIncrementalPokemonGrid(visibleCount < filteredPokemon.length, () => {
    setVisibleCount((currentCount) => Math.min(currentCount + RENDER_BATCH_SIZE, filteredPokemon.length));
  });
  const visiblePokemon = useMemo(() => filteredPokemon.slice(0, visibleCount), [filteredPokemon, visibleCount]);

  function resetVisiblePokemon() {
    setVisibleCount(INITIAL_RENDER_COUNT);
  }

  const caughtCount = caughtSet.size;
  const shinyCount = shinySet.size;
  const totalCount = pokemon.length;
  const completionRate = totalCount > 0 ? (caughtCount / totalCount) * 100 : 0;
  const selectedPrestigeLevel =
    PRESTIGE_LEVELS[unlockedPrestigeLevelIndex] ?? PRESTIGE_LEVELS[0];

  if (isLoading) {
    return (
      <main className="mx-auto mt-4 flex w-full max-w-4xl flex-col gap-4">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-sm">
          <p className="m-0 text-sm text-[var(--text)]">Loading shared Pokedex...</p>
        </section>
      </main>
    );
  }

  if (isNotFound) {
    return (
      <main className="mx-auto mt-4 flex w-full max-w-4xl flex-col gap-4">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-sm">
          <h2 className="m-0 text-xl font-semibold text-[var(--text-h)]">Pokedex not found</h2>
          <p className="mb-0 mt-2 text-sm text-[var(--text)]">
            This trainer has not shared a Pokedex yet, or the link is invalid.
          </p>
          <a
            href={`${import.meta.env.BASE_URL}`}
            className="mt-4 inline-flex h-10 items-center rounded-[10px] bg-[var(--text-h)] px-4 text-sm font-semibold text-white no-underline transition-colors hover:bg-[var(--code-bg)]"
          >
            Go to homepage
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto mt-4 flex w-full max-w-4xl flex-col gap-4">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-sm">
        <h2 className="m-0 mt-2 flex items-center gap-2 text-2xl font-semibold text-[var(--text-h)]">
          <img
            src={`${import.meta.env.BASE_URL}images/content/trainer.png`}
            alt="Trainer"
            className="h-8 w-8"
          />
          <span>{displayName}</span>
        </h2>
        <div className="mt-4">
          <PrestigeProgressCards
            prestigeLevel={selectedPrestigeLevel}
            caughtCount={caughtCount}
            totalCount={totalCount}
            shinyCount={shinyCount}
            completionRate={completionRate}
          />
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={searchQuery}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              resetVisiblePokemon();
              setSearchQuery(event.target.value);
            }}
            placeholder="Search by name, number, type, or region"
            className="h-10 w-full rounded-lg border border-[var(--border)] px-3 text-sm text-[var(--text-h)] outline-none ring-slate-300 transition focus:ring"
          />
          <PokedexFilterToggle
            filterMode={filterMode}
            onChange={(nextFilterMode) => {
              resetVisiblePokemon();
              setFilterMode(nextFilterMode);
            }}
          />
        </div>

        <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {visiblePokemon.map((entry) => {
            const pokemonKeyId = getPokemonKeyId(entry);
            const isCaught = caughtSet.has(pokemonKeyId);
            const isShiny = shinySet.has(pokemonKeyId);
            const displaySprite = isShiny ? entry.shinySprite ?? entry.sprite : entry.sprite;

            return (
                <article
                  key={pokemonKeyId}
                  className={`rounded-xl border p-3 ${
                  isShiny
                    ? "border-amber-300 bg-yellow-50 [html[data-theme='dark']_&]:border-amber-700 [html[data-theme='dark']_&]:bg-amber-950/40"
                    : isCaught
                      ? "border-emerald-300 bg-emerald-50 [html[data-theme='dark']_&]:border-emerald-700 [html[data-theme='dark']_&]:bg-emerald-950/40"
                      : "border-[var(--border)] bg-[var(--bg)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-[var(--text)]">#{entry.id}</span>
                  <span className={`text-xs font-semibold ${isCaught ? "text-emerald-700 [html[data-theme='dark']_&]:text-emerald-300" : "text-[var(--text)]"}`}>
                    {isCaught ? "Caught" : "Missing"}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {displaySprite ? (
                    <img src={displaySprite} alt={entry.name} className="h-10 w-10 object-contain" loading="lazy" />
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
                {isShiny ? (
                  <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 [html[data-theme='dark']_&]:bg-amber-900/40 [html[data-theme='dark']_&]:text-amber-300">
                    <PokeballIcon tone="ultraball" className="h-3.5 w-3.5" />
                    Shiny
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
        {visibleCount < filteredPokemon.length ? <div ref={loadMoreRef} className="h-1 w-full" aria-hidden="true" /> : null}
      </section>
    </main>
  );
}
