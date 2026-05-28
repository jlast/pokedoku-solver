import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { Pokemon } from "@pokedoku-helper/shared-types";
import { POKEDOKU_FORM_ID_MAPPING } from "@pokedoku-helper/shared-types";
import {
  getRemoteSettings,
  getRemoteUserDex,
  patchRemoteSettings,
  patchRemoteUserDex,
} from "@pokedoku-helper/user-api-client";
import { getSessionUserId, getSessionUserProfile, getValidSessionIdToken } from "../../lib/cognitoAuth";
import { PRESTIGE_LEVELS } from "../../lib/prestigeLevels";
import { FILTER_CATEGORIES } from "../../../../lib/shared/filters";
import { PokedexImportPanel } from "../components/pokedex/PokedexImportPanel";
import { PrestigeProgressCards } from "../components/pokedex/PrestigeProgressCards";
import { CategoryBadgeLink } from "../components/shared/CategoryBadgeLink";
import { SectionCard } from "../components/shared/SectionCard";
import { isUserDexStaleForLatestPuzzle } from "../lib/userDexSync";

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

function getCategoryHref(groupKey: string, optionName: string): string {
  const params = new URLSearchParams();
  params.set(groupKey, optionName);
  params.set("ownership", "unowned");
  return `${import.meta.env.BASE_URL}pokemon-list/?${params.toString()}`;
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
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [dismissedStaleImportReminderUpdatedAt, setDismissedStaleImportReminderUpdatedAt] = useState<string | null>(null);
  const [expandedStaleImportReminderUpdatedAt, setExpandedStaleImportReminderUpdatedAt] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(Boolean(userLabel));
  const [needsUsername, setNeedsUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!userLabel) return;

    let isCancelled = false;

    async function loadData() {
      try {
        const token = await getValidSessionIdToken();
        const apiBaseUrl = getApiBaseUrl();
        if (!token || !apiBaseUrl) {
          if (!isCancelled) {
            setHasPokedexData(false);
            setLastUpdatedAt(null);
            setIsLoading(false);
            setSettingsLoading(false);
          }
          return;
        }

        const remoteSettings = await getRemoteSettings({ token, apiBaseUrl });
        const remoteDisplayName = remoteSettings?.displayName.trim() ?? "";
        if (!remoteDisplayName) {
          if (!isCancelled) {
            setNeedsUsername(true);
            setSettingsLoading(false);
            setIsLoading(false);
          }
          return;
        }

        const pokemonResponse = await fetch(`${import.meta.env.BASE_URL}data/pokemon.json?t=${Date.now()}`);
        const pokemonData = (await pokemonResponse.json()) as Pokemon[];
        if (!isCancelled) {
          setPokemon(Array.isArray(pokemonData) ? pokemonData : []);
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
          setLastUpdatedAt(remoteUserDex?.updatedAt ?? null);
        }
      } catch {
        if (!isCancelled) {
          setPokemon([]);
          setCaughtSet(new Set<number>());
          setShinySet(new Set<number>());
          setUnlockedPrestigeLevelIndex(0);
          setHasPokedexData(false);
          setLastUpdatedAt(null);
        }
      }

      if (!isCancelled) {
        setSettingsLoading(false);
        setIsLoading(false);
      }
    }

    void loadData();

    return () => {
      isCancelled = true;
    };
  }, [reloadKey, userLabel]);

  async function saveUsername() {
    setUsernameError(null);
    const token = await getValidSessionIdToken();
    const apiBaseUrl = getApiBaseUrl();
    const nextDisplayName = usernameInput.trim();

    if (!nextDisplayName) {
      setUsernameError("Please enter a username.");
      return;
    }
    if (nextDisplayName.length > 40) {
      setUsernameError("Username must be 40 characters or fewer.");
      return;
    }
    if (!token || !apiBaseUrl) {
      setUsernameError("Session expired. Please sign in again.");
      return;
    }

    setIsSavingUsername(true);
    const updated = await patchRemoteSettings({
      token,
      apiBaseUrl,
      patch: {
        displayName: nextDisplayName,
      },
    });
    setIsSavingUsername(false);

    if (!updated?.displayName.trim()) {
      setUsernameError("Could not save username. Please try again.");
      return;
    }

    window.dispatchEvent(
      new CustomEvent("user-display-name-updated", {
        detail: { displayName: updated.displayName },
      })
    );

    setNeedsUsername(false);
    setSettingsLoading(true);
    setIsLoading(true);
    setReloadKey((prev) => prev + 1);
  }

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

      const updatedAt = new Date().toISOString();

      const didSave = await patchRemoteUserDex({
        token,
        apiBaseUrl,
        payload: {
          caughtPokemonKeyIds: Array.from(importedCaught).sort((a, b) => a - b),
          shinyPokemonKeyIds: Array.from(importedShiny).sort((a, b) => a - b),
          unlockedPrestigeLevelIndex: targetPrestigeLevelIndex,
          updatedAt,
        },
      });

      if (didSave) {
        setLastUpdatedAt(updatedAt);
      }
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
  const completionRate = totalCount > 0 ? (caughtCount / totalCount) * 100 : 0;
  const shinyOverallRate = totalCount > 0 ? (shinyCount / totalCount) * 100 : 0;
  const currentPrestige = PRESTIGE_LEVELS[unlockedPrestigeLevelIndex] ?? PRESTIGE_LEVELS[0];
  const showStaleImportReminder = hasPokedexData && isUserDexStaleForLatestPuzzle(lastUpdatedAt);
  const isStaleImportReminderDismissed = dismissedStaleImportReminderUpdatedAt === lastUpdatedAt;
  const isStaleImportReminderExpanded = expandedStaleImportReminderUpdatedAt === lastUpdatedAt;

  async function copyShareLink() {
    const userId = getSessionUserId();
    if (!userId) {
      setShareStatus("Could not build share link. Please sign in again.");
      return;
    }

    const url = new URL(`${import.meta.env.BASE_URL}user/shared/`, window.location.origin);
    url.searchParams.set("id", userId);

    try {
      await navigator.clipboard.writeText(url.toString());
      setShareStatus("Share link copied.");
    } catch {
      setShareStatus("Could not copy automatically. Use the open button and copy from your browser.");
    }
  }
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
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-sm">
          <h2 className="m-0 text-2xl font-semibold text-[var(--text-h)]">Welcome to your dashboard</h2>
          <p className="mb-0 mt-2 text-sm text-[var(--text)]">Sign in to edit your Pokedex and import your progress.</p>
          <a
            href={`${import.meta.env.BASE_URL}login/`}
            className="mt-4 inline-flex h-10 items-center rounded-[10px] bg-[var(--text-h)] px-4 text-sm font-semibold text-white no-underline transition-colors hover:bg-[var(--code-bg)]"
          >
            Go to Login
          </a>
        </section>
      </main>
    );
  }

  if (settingsLoading || isLoading) {
    return (
      <main className="mx-auto mt-4 flex w-full max-w-4xl flex-col gap-4">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-sm">
          <p className="m-0 text-sm text-[var(--text)]">Loading your dashboard...</p>
        </section>
      </main>
    );
  }

  if (needsUsername) {
    return (
      <main className="mx-auto mt-4 flex w-full max-w-3xl flex-col gap-4">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-sm">
          <p className="m-0 text-xs font-semibold tracking-wide text-[var(--text)] uppercase">Finish setup</p>
          <h2 className="m-0 mt-2 text-2xl font-semibold text-[var(--text-h)]">Create your username</h2>
          <p className="mb-0 mt-2 text-sm text-[var(--text)]">Pick a display name to continue to your Pokedex dashboard.</p>
          <label htmlFor="username" className="mt-4 block text-sm font-medium text-[var(--text)]">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={usernameInput}
            maxLength={40}
            onChange={(event) => {
              setUsernameInput(event.target.value);
              if (usernameError) setUsernameError(null);
            }}
            className="mt-2 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-h)] focus:border-[var(--accent)] focus:outline-none"
            placeholder="Enter a username"
          />
          <p className="m-0 mt-2 text-xs text-[var(--text)]">Any visible character is allowed. Maximum 40 characters.</p>
          {usernameError ? <p className="m-0 mt-2 text-sm text-red-600">{usernameError}</p> : null}
          <button
            type="button"
            onClick={() => {
              void saveUsername();
            }}
            disabled={isSavingUsername}
            className="mt-4 inline-flex h-10 items-center rounded-[10px] bg-[var(--text-h)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--code-bg)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingUsername ? "Saving..." : "Save username"}
          </button>
        </section>
      </main>
    );
  }

  if (!hasPokedexData) {
    return (
      <main className="mx-auto mt-4 flex w-full max-w-4xl flex-col gap-4">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-sm">
          <p className="m-0 text-xs font-semibold tracking-wide text-[var(--text)] uppercase">Get started</p>
          <h2 className="m-0 mt-2 text-2xl font-semibold text-[var(--text-h)]">Import your Pokedoku data</h2>
          <p className="mb-0 mt-2 text-sm text-[var(--text)]">No Pokedex progress found yet. Import your JSON to start.</p>
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
      {showStaleImportReminder && !isStaleImportReminderDismissed ? (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm [html[data-theme='dark']_&]:border-amber-800/60 [html[data-theme='dark']_&]:bg-amber-950/40">
          {isStaleImportReminderExpanded ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="m-0 text-xs font-semibold tracking-wide text-amber-800 uppercase [html[data-theme='dark']_&]:text-amber-200">
                    Import reminder
                  </p>
                  <h2 className="m-0 mt-1 text-lg font-semibold text-amber-950 [html[data-theme='dark']_&]:text-amber-100">
                    Your Pokedex may be out of date
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setDismissedStaleImportReminderUpdatedAt(lastUpdatedAt)}
                  className="inline-flex h-8 items-center rounded-lg px-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 [html[data-theme='dark']_&]:text-amber-200 [html[data-theme='dark']_&]:hover:bg-amber-900/60"
                >
                  Dismiss
                </button>
              </div>
              <p className="mb-0 mt-1.5 text-sm text-amber-900 [html[data-theme='dark']_&]:text-amber-100/90">
                Import your latest Pokedoku progress to keep suggestions accurate.
              </p>
              <PokedexImportPanel
                importJsonText={importJsonText}
                importStatus={importStatus}
                showImportPanel={true}
                onTogglePanel={() => undefined}
                onImportTextChange={setImportJsonText}
                onImportClick={importPokedexJson}
                onUploadChange={uploadPokedexJsonFile}
                embedded={true}
                compact={true}
              />
            </>
          ) : (
            <>
              <p className="m-0 text-xs font-semibold tracking-wide text-amber-800 uppercase [html[data-theme='dark']_&]:text-amber-200">
                Import reminder
              </p>
              <div className="mt-1.5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="m-0 text-lg font-semibold text-amber-950 [html[data-theme='dark']_&]:text-amber-100">
                    Your Pokedex may be out of date
                  </h2>
                  <p className="mb-0 mt-1 text-sm text-amber-900 [html[data-theme='dark']_&]:text-amber-100/90">
                    Import your latest Pokedoku progress to keep suggestions accurate.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedStaleImportReminderUpdatedAt(lastUpdatedAt)}
                    className="inline-flex h-10 items-center rounded-[10px] bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700"
                  >
                    Import progress
                  </button>
                  <button
                    type="button"
                    onClick={() => setDismissedStaleImportReminderUpdatedAt(lastUpdatedAt)}
                    className="inline-flex h-10 items-center rounded-[10px] px-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 [html[data-theme='dark']_&]:text-amber-200 [html[data-theme='dark']_&]:hover:bg-amber-900/60"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedStaleImportReminderUpdatedAt(lastUpdatedAt)}
                    className="text-xs font-semibold text-amber-800 underline decoration-amber-400 underline-offset-2 transition hover:text-amber-900 [html[data-theme='dark']_&]:text-amber-200 [html[data-theme='dark']_&]:hover:text-amber-100"
                  >
                    Need help?
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      ) : null}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--code-bg)] p-6 shadow-sm">
        <h2 className="m-0 text-2xl font-semibold text-[var(--text-h)]">Today&apos;s personalized board</h2>
        <p className="mb-0 mt-2 text-sm text-[var(--text)]">
          Use your My Pokedex filter to get suggestions tailored to what you still need.
        </p>
        <a
          href={`${import.meta.env.BASE_URL}pokedoku-answers-today/`}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-[10px] bg-emerald-700 px-4 text-sm font-semibold text-white no-underline transition-colors hover:bg-emerald-600"
        >
          Open personalized Today&apos;s board
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
            <path d="M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="m13 7 6 5-6 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SectionCard
          title="Edit current dex"
          className="rounded-2xl bg-[var(--code-bg)] p-6 shadow-sm"
        >
          <h3 className="m-0 mt-2 text-xl font-semibold text-[var(--text-h)]">Manage your live Pokedex</h3>
          <p className="mb-0 mt-2 text-sm text-[var(--text)]">Open the full editor page to update your current dex, or visit settings to change your nickname and import progress.</p>
          <a
              href={`${import.meta.env.BASE_URL}user/pokedex/`}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-[10px] bg-emerald-700 px-4 text-sm font-semibold text-white no-underline transition-colors hover:bg-emerald-600"
            >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
              <path d="M4 16.5V20h3.5L18.9 8.6l-3.5-3.5L4 16.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="m13.9 6.1 3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Edit current dex
          </a>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void copyShareLink();
              }}
                className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--bg)] px-4 text-sm font-semibold text-[var(--text-h)] transition-colors hover:bg-[var(--accent-bg)]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <rect x="4" y="4" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              Copy share link
            </button>
            {(() => {
              const userId = getSessionUserId();
              const shareHref = userId
                ? `${import.meta.env.BASE_URL}user/shared/?id=${encodeURIComponent(userId)}`
                : `${import.meta.env.BASE_URL}user/shared/`;
              return (
                <a
                  href={shareHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--bg)] px-4 text-sm font-semibold text-[var(--text-h)] no-underline transition-colors hover:bg-[var(--accent-bg)]"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                    <path d="M14 4h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10 14 20 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Open shared profile
                </a>
              );
            })()}
          </div>
          {shareStatus ? <p className="mb-0 mt-2 text-xs text-[var(--text)]">{shareStatus}</p> : null}
        </SectionCard>

        <div className="h-full">
          <PrestigeProgressCards
            prestigeLevel={currentPrestige}
            caughtCount={caughtCount}
            totalCount={totalCount}
            shinyCount={shinyCount}
            completionRate={completionRate}
            stacked
            mergedStacked
          />
        </div>

        <SectionCard
          title="Shiny progress"
          className="rounded-2xl border-amber-200 bg-amber-50 p-6 shadow-sm [html[data-theme='dark']_&]:border-amber-800/60 [html[data-theme='dark']_&]:bg-amber-900/40"
        >
          <div className="mt-2 flex items-center justify-between gap-3">
            <h3 className="m-0 text-xl font-bold text-amber-950 [html[data-theme='dark']_&]:text-amber-100">{shinyCount} shinies</h3>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 [html[data-theme='dark']_&]:bg-amber-800/50 [html[data-theme='dark']_&]:text-amber-200">
              ✨
            </span>
          </div>
          <div className="mt-3 space-y-2">
            <div>
              <div className="flex items-center justify-between">
                <p className="m-0 text-sm font-semibold text-amber-800 [html[data-theme='dark']_&]:text-amber-200">Full dex</p>
                <p className="m-0 text-base font-bold text-amber-950 [html[data-theme='dark']_&]:text-amber-100">{shinyOverallRate.toFixed(1)}%</p>
              </div>
              <progress
                value={Math.max(0, shinyOverallRate)}
                max={100}
                className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-amber-100 [html[data-theme='dark']_&]:[&::-webkit-progress-bar]:bg-amber-950/60 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-amber-500 [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-amber-500"
              />
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <SectionCard
          title="Categories with most Pokemon left"
          className="rounded-2xl p-6 shadow-sm"
        >
          <div className="mt-3 space-y-2">
            {mostLeft.map((entry) => (
              <div key={`${entry.groupKey}:${entry.name}`} className="flex items-center justify-between rounded-lg bg-[var(--code-bg)] px-3 py-2">
                <CategoryBadgeLink
                  parsed={{ raw: `${entry.groupKey}:${entry.name}`, type: entry.groupKey, label: entry.name }}
                  href={getCategoryHref(entry.groupKey, entry.name)}
                />
                <p className="m-0 text-sm font-semibold text-[var(--text-h)]">{entry.remaining} left</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Categories with least Pokemon left"
          className="rounded-2xl p-6 shadow-sm"
        >
          <div className="mt-3 space-y-2">
            {leastLeft.map((entry) => (
              <div key={`${entry.groupKey}:${entry.name}`} className="flex items-center justify-between rounded-lg bg-[var(--code-bg)] px-3 py-2">
                <CategoryBadgeLink
                  parsed={{ raw: `${entry.groupKey}:${entry.name}`, type: entry.groupKey, label: entry.name }}
                  href={getCategoryHref(entry.groupKey, entry.name)}
                />
                <p className="m-0 text-sm font-semibold text-[var(--text-h)]">{entry.remaining} left</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <section>
        <p className="m-0 text-xs font-semibold tracking-wide text-[var(--text)] uppercase">Category groups and remaining Pokemon</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-4">
          {categoryProgress.map((group) => (
            <div
              key={group.key}
              className={`rounded-xl border border-[var(--border)] bg-[var(--code-bg)] p-4 ${group.key === "move" || group.key === "types" ? "lg:col-span-2" : ""}`}
            >
              <h3 className="m-0 text-base font-semibold text-[var(--text-h)]">{group.label}</h3>
              <div className={group.key === "move" || group.key === "types" ? "mt-3 grid gap-2 sm:grid-cols-2" : "mt-3 space-y-2"}>
                {group.options.map((option) => {
                  const completed = option.total - option.remaining;
                  const completionPercent = option.total > 0 ? Math.round((completed / option.total) * 100) : 0;

                  return (
                    <div key={`${group.key}:${option.name}`} className="rounded-lg bg-[var(--bg)] px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <CategoryBadgeLink
                          parsed={{ raw: `${group.key}:${option.name}`, type: group.key, label: option.name }}
                          href={getCategoryHref(group.key, option.name)}
                        />
                        <p className="m-0 text-xs font-semibold text-[var(--text)]">{option.remaining} left / {option.total}</p>
                      </div>
                      <progress
                        value={completionPercent}
                        max={100}
                        className={`mt-2 h-1.5 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-[var(--code-bg)] [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:rounded-full ${getProgressColorClass(completionPercent)}`}
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
