import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { Pokemon } from "@pokedoku-helper/shared-types";
import { POKEDOKU_FORM_ID_MAPPING } from "@pokedoku-helper/shared-types";
import { getRemoteUserDex, patchRemoteUserDex } from "@pokedoku-helper/user-dex-client";
import { getSessionUserProfile, getValidSessionIdToken } from "../../lib/cognitoAuth";
import { PRESTIGE_LEVELS } from "../../lib/prestigeLevels";
import { FILTER_CATEGORIES } from "../../../../lib/shared/filters";
import { PokedexImportPanel } from "../components/pokedex/PokedexImportPanel";
import { CategoryBadgeLink } from "../components/shared/CategoryBadgeLink";

function getApiBaseUrl(): string | null {
  const baseUrl = import.meta.env.PUBLIC_USER_DEX_API_BASE_URL;
  if (!baseUrl || typeof baseUrl !== "string") return null;
  return baseUrl;
}

function getProgressColorClass(completionPercent: number): string {
  if (completionPercent >= 80) return "[&::-webkit-progress-value]:bg-emerald-500 [&::-moz-progress-bar]:bg-emerald-500";
  if (completionPercent >= 60) return "[&::-webkit-progress-value]:bg-lime-500 [&::-moz-progress-bar]:bg-lime-500";
  if (completionPercent >= 40) return "[&::-webkit-progress-value]:bg-amber-500 [&::-moz-progress-bar]:bg-amber-500";
  if (completionPercent >= 20) return "[&::-webkit-progress-value]:bg-orange-500 [&::-moz-progress-bar]:bg-orange-500";
  return "[&::-webkit-progress-value]:bg-rose-500 [&::-moz-progress-bar]:bg-rose-500";
}

export function PokedexDashboardPageClient() {
  const profile = typeof window === "undefined" ? null : getSessionUserProfile();
  const userLabel = profile?.label ?? null;
  const [isLoading, setIsLoading] = useState(Boolean(userLabel));
  const [hasPokedexData, setHasPokedexData] = useState(false);
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [caughtSet, setCaughtSet] = useState<Set<number>>(new Set<number>());
  const [shinySet, setShinySet] = useState<Set<number>>(new Set<number>());
  const [unlockedPrestigeLevelIndex, setUnlockedPrestigeLevelIndex] = useState(0);
  const [importJsonText, setImportJsonText] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showImportPanel, setShowImportPanel] = useState(true);

  useEffect(() => {
    if (!userLabel) return;

    let isCancelled = false;

    async function loadData() {
      try {
        const pokemonResponse = await fetch(`${import.meta.env.BASE_URL}data/pokemon.json?t=${Date.now()}`);
        const pokemonData = (await pokemonResponse.json()) as Pokemon[];
        if (!isCancelled) {
          setPokemon(Array.isArray(pokemonData) ? pokemonData : []);
        }

        const token = await getValidSessionIdToken();
        const apiBaseUrl = getApiBaseUrl();
        if (!token || !apiBaseUrl) {
          if (!isCancelled) {
            setHasPokedexData(false);
            setIsLoading(false);
          }
          return;
        }

        const remoteUserDex = await getRemoteUserDex({ token, apiBaseUrl, maxPrestigeLevelIndex: PRESTIGE_LEVELS.length - 1 });
        const remoteCaughtSet = new Set(remoteUserDex?.caughtPokemonKeyIds ?? []);
        const remoteShinySet = new Set(remoteUserDex?.shinyPokemonKeyIds ?? []);
        const remotePrestigeIndex = remoteUserDex?.unlockedPrestigeLevelIndex ?? 0;
        const hasData = Boolean(remoteUserDex) && (remotePrestigeIndex > 0 || remoteCaughtSet.size > 0 || remoteShinySet.size > 0);

        if (!isCancelled) {
          setCaughtSet(remoteCaughtSet);
          setShinySet(remoteShinySet);
          setUnlockedPrestigeLevelIndex(remotePrestigeIndex);
          setHasPokedexData(hasData);
        }
      } catch {
        if (!isCancelled) {
          setPokemon([]);
          setCaughtSet(new Set<number>());
          setShinySet(new Set<number>());
          setUnlockedPrestigeLevelIndex(0);
          setHasPokedexData(false);
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
  }, [userLabel]);

  async function applyImportedPokedexJson(rawJsonText: string, source: "paste" | "file") {
    try {
      const parsed = JSON.parse(rawJsonText) as {
        prestige?: unknown;
        entries?: Array<{ "@t"?: unknown; pokemonId?: unknown; shiny?: unknown }>;
      };

      const validIds = new Set(pokemon.map((entry) => entry.formId ?? entry.id));
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

      setCaughtSet(importedCaught);
      setShinySet(importedShiny);
      setUnlockedPrestigeLevelIndex(targetPrestigeLevelIndex);
      setHasPokedexData(targetPrestigeLevelIndex > 0 || importedCaught.size > 0 || importedShiny.size > 0);
      setImportStatus(`${source === "file" ? "Uploaded" : "Imported"} ${importedCaught.size} unlocked Pokemon and ${importedShiny.size} shinies.`);

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
      .then((text) => applyImportedPokedexJson(text, "file"))
      .catch(() => {
        setImportStatus("Upload failed. Please select valid JSON.");
      })
      .finally(() => {
        event.target.value = "";
      });
  }

  const totalCount = pokemon.length;
  const caughtCount = caughtSet.size;
  const shinyCount = shinySet.size;
  const completionRate = totalCount > 0 ? Math.round((caughtCount / totalCount) * 100) : 0;
  const shinyOverallRate = totalCount > 0 ? Math.round((shinyCount / totalCount) * 100) : 0;
  const shinyCaughtRate = caughtCount > 0 ? Math.round((shinyCount / caughtCount) * 100) : 0;
  const currentPrestige = PRESTIGE_LEVELS[unlockedPrestigeLevelIndex] ?? PRESTIGE_LEVELS[0];
  const categoryProgress = useMemo(() => {
    return FILTER_CATEGORIES.map((group) => {
      const options = group.options
        .map((option) => {
          const total = pokemon.filter((entry) => option.filter(entry)).length;
          const remaining = pokemon.filter((entry) => option.filter(entry) && !caughtSet.has(entry.formId ?? entry.id)).length;
          return { name: option.name, total, remaining };
        })
        .filter((option) => option.total > 0);
      return { key: group.key, label: group.label, options };
    });
  }, [pokemon, caughtSet]);

  const flattened = useMemo(
    () => categoryProgress.flatMap((group) => group.options.map((option) => ({ ...option, groupKey: group.key, groupLabel: group.label }))),
    [categoryProgress],
  );
  const leastLeft = useMemo(
    () =>
      flattened
        .filter((entry) => entry.remaining > 0 && entry.groupKey !== "move" && entry.groupKey !== "ability")
        .sort((a, b) => a.remaining - b.remaining || a.name.localeCompare(b.name))
        .slice(0, 8),
    [flattened],
  );
  const mostLeft = useMemo(
    () =>
      flattened
        .filter((entry) => entry.remaining > 0 && entry.groupKey !== "move" && entry.groupKey !== "ability")
        .sort((a, b) => b.remaining - a.remaining || a.name.localeCompare(b.name))
        .slice(0, 8),
    [flattened],
  );

  if (!userLabel) {
    return (
      <main className="mx-auto mt-4 flex w-full max-w-4xl flex-col gap-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="m-0 text-2xl font-semibold text-slate-900">Welcome to your dashboard</h2>
          <p className="mb-0 mt-2 text-sm text-slate-600">Sign in to edit your Pokedex and import your progress.</p>
          <a
            href={`${import.meta.env.BASE_URL}login/`}
            className="mt-4 inline-flex h-10 items-center rounded-[10px] bg-slate-900 px-4 text-sm font-semibold text-white no-underline transition-colors hover:bg-slate-800"
          >
            Go to Login
          </a>
        </section>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="mx-auto mt-4 flex w-full max-w-4xl flex-col gap-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="m-0 text-sm text-slate-600">Loading your dashboard...</p>
        </section>
      </main>
    );
  }

  if (!hasPokedexData) {
    return (
      <main className="mx-auto mt-4 flex w-full max-w-4xl flex-col gap-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="m-0 text-xs font-semibold tracking-wide text-slate-500 uppercase">Get started</p>
          <h2 className="m-0 mt-2 text-2xl font-semibold text-slate-900">Import your Pokedoku data</h2>
          <p className="mb-0 mt-2 text-sm text-slate-600">No Pokedex progress found yet. Import your JSON to start.</p>
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

  return (
    <main className="mx-auto mt-4 flex w-full max-w-5xl flex-col gap-4">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="m-0 text-xs font-semibold tracking-wide text-slate-500 uppercase">Edit current dex</p>
          <h3 className="m-0 mt-2 text-xl font-semibold text-slate-900">Manage your live Pokedex</h3>
          <p className="mb-0 mt-2 text-sm text-slate-600">Open the full editor page to update your current dex.</p>
          <a
            href={`${import.meta.env.BASE_URL}user/pokedex/`}
            className="mt-4 inline-flex h-10 items-center rounded-[10px] bg-slate-900 px-4 text-sm font-semibold text-white no-underline transition-colors hover:bg-slate-800"
          >
            Edit current dex
          </a>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="m-0 text-xs font-semibold tracking-wide text-slate-500 uppercase">Current Prestige Progress</p>
          <h3 className="m-0 mt-2 text-xl font-semibold text-slate-900">{currentPrestige.label}</h3>
          <p className="m-0 mt-1 text-sm text-slate-600">{caughtCount} / {totalCount} caught ({completionRate}%)</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="m-0 text-xs font-semibold tracking-wide text-slate-500 uppercase">Shiny progress</p>
          <h3 className="m-0 mt-2 text-xl font-semibold text-slate-900">{shinyCount} shinies</h3>
          <p className="m-0 mt-1 text-sm text-slate-600">{shinyOverallRate}% of full dex</p>
          <p className="m-0 mt-1 text-xs text-slate-500">{shinyCaughtRate}% of caught Pokemon</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="m-0 text-xs font-semibold tracking-wide text-slate-500 uppercase">Categories with most Pokemon left</p>
          <div className="mt-3 space-y-2">
            {mostLeft.map((entry) => (
              <div key={`${entry.groupKey}:${entry.name}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <CategoryBadgeLink parsed={{ raw: `${entry.groupKey}:${entry.name}`, type: entry.groupKey, label: entry.name }} href={null} />
                <p className="m-0 text-sm font-semibold text-slate-900">{entry.remaining} left</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="m-0 text-xs font-semibold tracking-wide text-slate-500 uppercase">Categories with least Pokemon left</p>
          <div className="mt-3 space-y-2">
            {leastLeft.map((entry) => (
              <div key={`${entry.groupKey}:${entry.name}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <CategoryBadgeLink parsed={{ raw: `${entry.groupKey}:${entry.name}`, type: entry.groupKey, label: entry.name }} href={null} />
                <p className="m-0 text-sm font-semibold text-slate-900">{entry.remaining} left</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="m-0 text-xs font-semibold tracking-wide text-slate-500 uppercase">Category groups and remaining Pokemon</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-4">
          {categoryProgress.map((group) => (
            <div
              key={group.key}
              className={`rounded-xl border border-slate-200 bg-slate-50 p-4 ${group.key === "move" || group.key === "types" ? "lg:col-span-2" : ""}`}
            >
              <h3 className="m-0 text-base font-semibold text-slate-900">{group.label}</h3>
              <div className={group.key === "move" || group.key === "types" ? "mt-3 grid gap-2 sm:grid-cols-2" : "mt-3 space-y-2"}>
                {group.options.map((option) => {
                  const completed = option.total - option.remaining;
                  const completionPercent = option.total > 0 ? Math.round((completed / option.total) * 100) : 0;

                  return (
                    <div key={`${group.key}:${option.name}`} className="rounded-lg bg-white px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <CategoryBadgeLink parsed={{ raw: `${group.key}:${option.name}`, type: group.key, label: option.name }} href={null} />
                        <p className="m-0 text-xs font-semibold text-slate-600">{option.remaining} left / {option.total}</p>
                      </div>
                      <progress
                        value={completionPercent}
                        max={100}
                        className={`mt-2 h-1.5 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-slate-200 [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:rounded-full ${getProgressColorClass(completionPercent)}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
