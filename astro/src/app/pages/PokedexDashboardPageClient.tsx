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
import {
  getSessionUserId,
  getSessionUserProfile,
  getValidSessionIdToken,
} from "../../lib/cognitoAuth";
import { PRESTIGE_LEVELS } from "../../lib/prestigeLevels";
import { FILTER_CATEGORIES } from "../../../../lib/shared/filters";
import { PokedexImportPanel } from "../components/pokedex/PokedexImportPanel";
import { CategoryBadgeLink } from "../components/shared/CategoryBadgeLink";
import { DifficultyBadge } from "../components/today-board-suggestions/DifficultyBadge";
import { getPrestigeUiTone } from "../lib/prestigeUi";
import { isUserDexStaleForLatestPuzzle } from "../lib/userDexSync";
import { slugify } from "../../lib/slug";

function getApiBaseUrl(): string | null {
  const baseUrl = import.meta.env.PUBLIC_USER_DEX_API_BASE_URL;
  if (!baseUrl || typeof baseUrl !== "string") return null;
  return baseUrl;
}

function getProgressColorClass(completionPercent: number): string {
  if (completionPercent >= 80)
    return "[&::-webkit-progress-value]:bg-emerald-500 [&::-moz-progress-bar]:bg-emerald-500";
  if (completionPercent >= 60)
    return "[&::-webkit-progress-value]:bg-lime-500 [&::-moz-progress-bar]:bg-lime-500";
  if (completionPercent >= 40)
    return "[&::-webkit-progress-value]:bg-amber-500 [&::-moz-progress-bar]:bg-amber-500";
  if (completionPercent >= 20)
    return "[&::-webkit-progress-value]:bg-orange-500 [&::-moz-progress-bar]:bg-orange-500";
  return "[&::-webkit-progress-value]:bg-rose-500 [&::-moz-progress-bar]:bg-rose-500";
}

function getCategoryHref(groupKey: string, optionName: string): string {
  const params = new URLSearchParams();
  params.set(groupKey, optionName);
  params.set("ownership", "unowned");
  return `${import.meta.env.BASE_URL}pokemon-list/?${params.toString()}`;
}

export function PokedexDashboardPageClient() {
  const profile =
    typeof window === "undefined" ? null : getSessionUserProfile();
  const userLabel = profile?.label ?? null;
  const [isLoading, setIsLoading] = useState(Boolean(userLabel));
  const [hasPokedexData, setHasPokedexData] = useState(false);
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [caughtSet, setCaughtSet] = useState<Set<number>>(new Set<number>());
  const [shinySet, setShinySet] = useState<Set<number>>(new Set<number>());
  const [unlockedPrestigeLevelIndex, setUnlockedPrestigeLevelIndex] =
    useState(0);
  const [importJsonText, setImportJsonText] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showImportPanel, setShowImportPanel] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [
    dismissedStaleImportReminderUpdatedAt,
    setDismissedStaleImportReminderUpdatedAt,
  ] = useState<string | null>(null);
  const [
    expandedStaleImportReminderUpdatedAt,
    setExpandedStaleImportReminderUpdatedAt,
  ] = useState<string | null>(null);
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

        const pokemonResponse = await fetch(
          `${import.meta.env.BASE_URL}data/pokemon.json?t=${Date.now()}`,
        );
        const pokemonData = (await pokemonResponse.json()) as Pokemon[];
        if (!isCancelled) {
          setPokemon(Array.isArray(pokemonData) ? pokemonData : []);
        }

        const remoteUserDex = await getRemoteUserDex({
          token,
          apiBaseUrl,
          maxPrestigeLevelIndex: PRESTIGE_LEVELS.length - 1,
        });
        const remoteCaughtSet = new Set(
          remoteUserDex?.caughtPokemonKeyIds ?? [],
        );
        const remoteShinySet = new Set(remoteUserDex?.shinyPokemonKeyIds ?? []);
        const remotePrestigeIndex =
          remoteUserDex?.unlockedPrestigeLevelIndex ?? 0;
        const hasData =
          Boolean(remoteUserDex) &&
          (remotePrestigeIndex > 0 ||
            remoteCaughtSet.size > 0 ||
            remoteShinySet.size > 0);

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
      }),
    );

    setNeedsUsername(false);
    setSettingsLoading(true);
    setIsLoading(true);
    setReloadKey((prev) => prev + 1);
  }

  async function applyImportedPokedexJson(
    rawJsonText: string,
    source: "paste" | "file",
  ) {
    try {
      const parsed = JSON.parse(rawJsonText) as {
        prestige?: unknown;
        entries?: Array<{
          "@t"?: unknown;
          pokemonId?: unknown;
          shiny?: unknown;
        }>;
      };

      const validIds = new Set(
        pokemon.map((entry) => entry.formId ?? entry.id),
      );
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
        targetPrestigeLevelIndex = Math.max(
          0,
          Math.min(PRESTIGE_LEVELS.length - 1, Math.floor(importedPrestige)),
        );
      }

      setCaughtSet(importedCaught);
      setShinySet(importedShiny);
      setUnlockedPrestigeLevelIndex(targetPrestigeLevelIndex);
      setHasPokedexData(
        targetPrestigeLevelIndex > 0 ||
          importedCaught.size > 0 ||
          importedShiny.size > 0,
      );
      setImportStatus(
        `${source === "file" ? "Uploaded" : "Imported"} ${importedCaught.size} unlocked Pokemon and ${importedShiny.size} shinies.`,
      );

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
      setImportStatus(
        source === "file"
          ? "Upload failed. Please select valid JSON."
          : "Import failed. Please paste valid JSON.",
      );
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
  const currentPrestige =
    PRESTIGE_LEVELS[unlockedPrestigeLevelIndex] ?? PRESTIGE_LEVELS[0];
  const currentPrestigeUiTone = getPrestigeUiTone(currentPrestige.tone);
  const nextPrestige = PRESTIGE_LEVELS[unlockedPrestigeLevelIndex + 1] ?? null;
  const remainingCount = Math.max(0, totalCount - caughtCount);
  const showStaleImportReminder =
    hasPokedexData && isUserDexStaleForLatestPuzzle(lastUpdatedAt);
  const isStaleImportReminderDismissed =
    dismissedStaleImportReminderUpdatedAt === lastUpdatedAt;
  const isStaleImportReminderExpanded =
    expandedStaleImportReminderUpdatedAt === lastUpdatedAt;

  async function copyShareLink() {
    const userId = getSessionUserId();
    if (!userId) {
      setShareStatus("Could not build share link. Please sign in again.");
      return;
    }

    const url = new URL(
      `${import.meta.env.BASE_URL}user/shared/`,
      window.location.origin,
    );
    url.searchParams.set("id", userId);

    try {
      await navigator.clipboard.writeText(url.toString());
      setShareStatus("Share link copied.");
    } catch {
      setShareStatus(
        "Could not copy automatically. Use the open button and copy from your browser.",
      );
    }
  }
  const categoryProgress = useMemo(() => {
    return FILTER_CATEGORIES.map((group) => {
      const options = group.options
        .map((option) => {
          const total = pokemon.filter((entry) => option.filter(entry)).length;
          const remaining = pokemon.filter(
            (entry) =>
              option.filter(entry) && !caughtSet.has(entry.formId ?? entry.id),
          ).length;
          return { name: option.name, total, remaining };
        })
        .filter((option) => option.total > 0);
      return { key: group.key, label: group.label, options };
    });
  }, [pokemon, caughtSet]);

  const flattened = useMemo(
    () =>
      categoryProgress.flatMap((group) =>
        group.options.map((option) => ({
          ...option,
          groupKey: group.key,
          groupLabel: group.label,
        })),
      ),
    [categoryProgress],
  );
  const leastLeft = useMemo(
    () =>
      flattened
        .filter(
          (entry) =>
            entry.remaining > 0 &&
            entry.groupKey !== "move" &&
            entry.groupKey !== "ability",
        )
        .sort(
          (a, b) => a.remaining - b.remaining || a.name.localeCompare(b.name),
        )
        .slice(0, 8),
    [flattened],
  );
  const missingPokemonPreview = useMemo(
    () =>
      pokemon
        .filter((entry) => !caughtSet.has(entry.formId ?? entry.id))
        .sort(
          (a, b) =>
            b.dexDifficultyPercentile - a.dexDifficultyPercentile ||
            a.id - b.id,
        )
        .slice(0, 6),
    [pokemon, caughtSet],
  );

  if (!userLabel) {
    return (
      <main className="mx-auto mt-4 flex w-full max-w-4xl flex-col gap-4">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-sm">
          <h2 className="m-0 text-2xl font-semibold text-[var(--text-h)]">
            Welcome to your dashboard
          </h2>
          <p className="mb-0 mt-2 text-sm text-[var(--text)]">
            Sign in to edit your Pokedex and import your progress.
          </p>
          <a
            href={`${import.meta.env.BASE_URL}login/`}
            className="mt-4 inline-flex h-10 items-center rounded-[10px] border border-[var(--border)] bg-[var(--code-bg)] px-4 text-sm font-semibold text-[var(--text-h)] no-underline transition-colors hover:bg-[var(--accent-bg)]"
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
          <p className="m-0 text-sm text-[var(--text)]">
            Loading your dashboard...
          </p>
        </section>
      </main>
    );
  }

  if (needsUsername) {
    return (
      <main className="mx-auto mt-4 flex w-full max-w-3xl flex-col gap-4">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-6 shadow-sm">
          <p className="m-0 text-xs font-semibold tracking-wide text-[var(--text)] uppercase">
            Finish setup
          </p>
          <h2 className="m-0 mt-2 text-2xl font-semibold text-[var(--text-h)]">
            Create your username
          </h2>
          <p className="mb-0 mt-2 text-sm text-[var(--text)]">
            Pick a display name to continue to your Pokedex dashboard.
          </p>
          <label
            htmlFor="username"
            className="mt-4 block text-sm font-medium text-[var(--text)]"
          >
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
          <p className="m-0 mt-2 text-xs text-[var(--text)]">
            Any visible character is allowed. Maximum 40 characters.
          </p>
          {usernameError ? (
            <p className="m-0 mt-2 text-sm text-red-600">{usernameError}</p>
          ) : null}
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
          <p className="m-0 text-xs font-semibold tracking-wide text-[var(--text)] uppercase">
            Get started
          </p>
          <h2 className="m-0 mt-2 text-2xl font-semibold text-[var(--text-h)]">
            Import your Pokedoku data
          </h2>
          <p className="mb-0 mt-2 text-sm text-[var(--text)]">
            No Pokedex progress found yet. Import your JSON to start.
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

  return (
    <main className="mx-auto mt-4 flex w-full max-w-5xl flex-col gap-4">
      {showStaleImportReminder && !isStaleImportReminderDismissed ? (
        <section className="rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-4 shadow-sm">
          {isStaleImportReminderExpanded ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="m-0 text-xs font-semibold tracking-wide text-[var(--warning-text)] uppercase">
                    Import reminder
                  </p>
                  <h2 className="m-0 mt-1 text-lg font-semibold text-[var(--warning-text-strong)]">
                    Your Pokedex may be out of date
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDismissedStaleImportReminderUpdatedAt(lastUpdatedAt)
                  }
                  className="inline-flex h-8 items-center rounded-lg px-2.5 text-sm font-semibold text-[var(--warning-text)] transition hover:bg-[var(--warning-hover)]"
                >
                  Dismiss
                </button>
              </div>
              <p className="mb-0 mt-1.5 text-sm text-[var(--warning-text-strong)]/90">
                Import your latest Pokedoku progress to keep suggestions
                accurate.
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
              <p className="m-0 text-xs font-semibold tracking-wide text-[var(--warning-text)] uppercase">
                Import reminder
              </p>
              <div className="mt-1.5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="m-0 text-lg font-semibold text-[var(--warning-text-strong)]">
                    Your Pokedex may be out of date
                  </h2>
                  <p className="mb-0 mt-1 text-sm text-[var(--warning-text-strong)]/90">
                    Import your latest Pokedoku progress to keep suggestions
                    accurate.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedStaleImportReminderUpdatedAt(lastUpdatedAt)
                    }
                    className="inline-flex h-10 items-center rounded-[10px] bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700"
                  >
                    Import progress
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDismissedStaleImportReminderUpdatedAt(lastUpdatedAt)
                    }
                    className="inline-flex h-10 items-center rounded-[10px] px-3 text-sm font-semibold text-[var(--warning-text)] transition hover:bg-[var(--warning-hover)]"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedStaleImportReminderUpdatedAt(lastUpdatedAt)
                    }
                    className="text-xs font-semibold text-[var(--warning-text)] underline decoration-[var(--warning-border)] underline-offset-2 transition hover:text-[var(--warning-text-strong)]"
                  >
                    Need help?
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-emerald-600 to-emerald-700 p-7 text-white shadow-[0_20px_50px_rgba(5,150,105,0.24)]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-white/10 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-8 bottom-4 text-8xl opacity-10"
            >
              ◐
            </div>
            <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="m-0 text-xs font-semibold tracking-[0.18em] text-emerald-100 uppercase">
                  Today&apos;s board
                </p>
                <h2 className="m-0 mt-3 text-3xl font-semibold text-white">
                  Today&apos;s personalized board
                </h2>
                <p className="mb-0 mt-3 max-w-2xl text-sm text-emerald-50/90">
                  Open today&apos;s board with suggestions tuned to the Pokemon
                  you still need, so you can start from your current collection
                  instead of guessing cold.
                </p>
              </div>
              <a
                href={`${import.meta.env.BASE_URL}pokedoku-answers-today/`}
                className="inline-flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-emerald-800 no-underline shadow-sm transition-transform hover:-translate-y-px"
              >
                Open board
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M5 12h14"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="m13 7 6 5-6 5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </div>
            <div className="relative z-10 mt-6 grid gap-5 sm:grid-cols-3">
              <div>
                <p className="m-0 text-3xl font-bold text-white">
                  {remainingCount}
                </p>
                <p className="m-0 mt-1 text-sm text-emerald-100/90">
                  Pokemon remaining
                </p>
              </div>
              <div>
                <p className="m-0 text-3xl font-bold text-white">
                  {shinyCount}
                </p>
                <p className="m-0 mt-1 text-sm text-emerald-100/90">
                  Shinies tracked
                </p>
              </div>
              <div>
                <p className="m-0 text-3xl font-bold text-white">Today</p>
                <p className="m-0 mt-1 text-sm text-emerald-100/90">
                  Answers ready now
                </p>
              </div>
            </div>
          </section>

          <section
            className={`rounded-3xl border p-7 shadow-sm ${currentPrestigeUiTone.completionBg} ${currentPrestigeUiTone.completionBorder}`}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p
                  className={`m-0 text-xs font-semibold tracking-wide uppercase ${currentPrestigeUiTone.completionLabelText}`}
                >
                  Dex progress
                </p>
                <h2
                  className={`m-0 mt-2 text-2xl font-semibold ${currentPrestigeUiTone.bannerTitleText}`}
                >
                  Current prestige: {currentPrestige.label}
                </h2>
                <p
                  className={`mb-0 mt-2 text-sm ${currentPrestigeUiTone.bannerOddsText}`}
                >
                  {remainingCount} Pokemon remaining
                  {nextPrestige ? ` to unlock ${nextPrestige.label}` : "."}
                </p>
              </div>
              <div className="grid min-w-[220px] grid-cols-2 gap-x-6 gap-y-2">
                <div>
                  <p
                    className={`m-0 text-xs font-semibold tracking-wide uppercase ${currentPrestigeUiTone.completionLabelText}`}
                  >
                    Completion
                  </p>
                  <p
                    className={`m-0 mt-2 text-xl font-bold ${currentPrestigeUiTone.completionValueText}`}
                  >
                    {caughtCount} / {totalCount}
                  </p>
                </div>
                <div>
                  <p
                    className={`m-0 text-xs font-semibold tracking-wide uppercase ${currentPrestigeUiTone.completionLabelText}`}
                  >
                    Progress
                  </p>
                  <p
                    className={`m-0 mt-2 text-xl font-bold ${currentPrestigeUiTone.completionValueText}`}
                  >
                    {completionRate.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
            <progress
              value={Math.max(0, caughtCount)}
              max={Math.max(totalCount, 1)}
              className={`mt-5 h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-[var(--bg)]/70 [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:rounded-full ${currentPrestigeUiTone.progressValueClass}`}
            />
            <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-3">
              <div>
                <p
                  className={`m-0 text-xs font-semibold tracking-wide uppercase ${currentPrestigeUiTone.completionLabelText}`}
                >
                  Current prestige
                </p>
                <p
                  className={`m-0 mt-1.5 text-base font-bold ${currentPrestigeUiTone.completionValueText}`}
                >
                  {currentPrestige.label}
                </p>
              </div>
              <div>
                <p
                  className={`m-0 text-xs font-semibold tracking-wide uppercase ${currentPrestigeUiTone.completionLabelText}`}
                >
                  Next prestige
                </p>
                <p
                  className={`m-0 mt-1.5 text-base font-bold ${currentPrestigeUiTone.completionValueText}`}
                >
                  {nextPrestige?.label ?? "All unlocked"}
                </p>
              </div>
              <div>
                <p
                  className={`m-0 text-xs font-semibold tracking-wide uppercase ${currentPrestigeUiTone.completionLabelText}`}
                >
                  Remaining
                </p>
                <p
                  className={`m-0 mt-1.5 text-base font-bold ${currentPrestigeUiTone.completionValueText}`}
                >
                  {remainingCount} Pokemon
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <section className="rounded-3xl bg-sky-50/70 p-6 shadow-sm [html[data-theme='dark']_&]:bg-sky-950/18">
              <p className="m-0 text-xs font-semibold tracking-wide text-[var(--text)] uppercase">
                Missing preview
              </p>
              <h2 className="m-0 mt-2 text-xl font-semibold text-[var(--text-h)]">
                Suggested next catches
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {missingPokemonPreview.map((entry) => {
                  const pokemonSlug = entry ? `${slugify(entry.name)}-${entry.formId ?? entry.id}` : null;
                  return (
                  <a
                    key={entry.formId ?? entry.id}
                    href={`/pokemon/${pokemonSlug}/`}
                    className="rounded-2xl bg-white/80 p-3 text-[var(--text-h)] no-underline shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-transform hover:-translate-y-px [html[data-theme='dark']_&]:bg-slate-900/70"
                  >
                    <div className="flex flex-col items-center text-center">
                      <p className="m-0 text-sm font-semibold text-[var(--text-h)]">
                        <span className="mr-1 text-xs font-medium text-[var(--text)]">
                          #{entry.id}
                        </span>
                        {entry.name}
                      </p>
                      {entry.sprite ? (
                        <img
                          src={entry.sprite}
                          alt={entry.name}
                          className="mt-2 h-14 w-14 object-contain"
                          loading="lazy"
                        />
                      ) : null}
                      <div className="mt-2">
                        <DifficultyBadge difficulty={entry.dexDifficulty} />
                      </div>
                    </div>
                  </a>
                )})}
              </div>
            </section>

            <section className="rounded-3xl bg-violet-50/70 p-6 shadow-sm [html[data-theme='dark']_&]:bg-violet-950/18">
              <p className="m-0 text-xs font-semibold tracking-wide text-[var(--text)] uppercase">
                Closest milestones
              </p>
              <h2 className="m-0 mt-2 text-xl font-semibold text-[var(--text-h)]">
                Closest complete categories
              </h2>
              <div className="mt-4 space-y-1.5">
                {leastLeft.map((entry) => (
                  <div
                    key={`${entry.groupKey}:${entry.name}`}
                    className="rounded-xl bg-white/80 px-3 py-2 [html[data-theme='dark']_&]:bg-slate-900/70"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <CategoryBadgeLink
                        parsed={{
                          raw: `${entry.groupKey}:${entry.name}`,
                          type: entry.groupKey,
                          label: entry.name,
                        }}
                        href={getCategoryHref(entry.groupKey, entry.name)}
                      />
                      <p className="m-0 text-xs font-semibold text-[var(--text-h)]">
                        {entry.remaining} left / {entry.total}
                      </p>
                    </div>
                    <progress
                      value={entry.total - entry.remaining}
                      max={Math.max(entry.total, 1)}
                      className="mt-1.5 h-1 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-violet-100/80 [html[data-theme='dark']_&]:[&::-webkit-progress-bar]:bg-violet-950/50 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-violet-500/70 [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-violet-500/70"
                    />
                  </div>
                ))}
              </div>
            </section>
          </section>
        </div>

        <aside className="space-y-4 lg:pt-2">
          <section className="rounded-2xl bg-amber-50 p-5 shadow-sm [html[data-theme='dark']_&]:bg-amber-900/28">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="m-0 text-xs font-semibold tracking-wide text-amber-800 uppercase [html[data-theme='dark']_&]:text-amber-200">
                  Shiny progress
                </p>
                <h2 className="m-0 mt-2 text-xl font-bold text-amber-950 [html[data-theme='dark']_&]:text-amber-100">
                  {shinyCount} shinies
                </h2>
              </div>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700 [html[data-theme='dark']_&]:bg-amber-800/50 [html[data-theme='dark']_&]:text-amber-200">
                ✨
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <p className="m-0 text-sm font-semibold text-amber-800 [html[data-theme='dark']_&]:text-amber-200">
                  Full dex
                </p>
                <p className="m-0 text-base font-bold text-amber-950 [html[data-theme='dark']_&]:text-amber-100">
                  {shinyOverallRate.toFixed(1)}%
                </p>
              </div>
              <progress
                value={Math.max(0, shinyOverallRate)}
                max={100}
                className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-amber-100/80 [html[data-theme='dark']_&]:[&::-webkit-progress-bar]:bg-amber-950/60 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-amber-500 [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-amber-500"
              />
            </div>
          </section>

          <section className="rounded-2xl bg-[var(--bg)] p-5 shadow-sm">
            <p className="m-0 text-xs font-semibold tracking-wide text-[var(--text)] uppercase">
              Quick tools
            </p>
            <h2 className="m-0 mt-2 text-xl font-semibold text-[var(--text-h)]">
              Profile shortcuts
            </h2>
            <p className="mb-0 mt-2 text-sm text-[var(--text)]">
              Jump into the most common profile and dex actions.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <a
                href={`${import.meta.env.BASE_URL}user/settings/`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--code-bg)] px-4 text-sm font-semibold text-[var(--text-h)] no-underline transition-colors hover:bg-[var(--accent-bg)]"
              >
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 512 512"
  fill="currentColor"
>
  <path d="m501,300.8v-91.7h-45.3c-5.3-22.4-14.3-43.3-26.4-62.1l32.9-32.7-64.9-64.6-33.4,33.3c-18.8-11.5-39.6-19.9-61.8-24.8v-47.2h-92.1v48.3c-22,5.4-42.6,14.4-61.1,26.4l-34.2-34-64.9,64.6 35.3,35.2c-2.8,4.6-5.3,9.2-7.7,14-7.5,14.3-13.2,30-17.1,45.7h-49.3v91.7h50.3c1.5,6 3.3,11.9 5.3,17.8 0.1,0.4 0.3,0.8 0.4,1.2 0,0.1 0.1,0.2 0.1,0.4 4.9,14.2 11.3,27.7 19.1,40.2l-35.5,35.3 64.9,64.6 35.1-34.9c18.3,11.5 38.6,20.2 60.2,25.4v48.1h91.1v-47.1c22.7-5 44-13.7 63.1-25.6l32.2,32 64.9-64.6-32.1-31.9c12-19.1 20.9-40.3 26-62.9h44.9zm-94.8,64 29.9,29.8-36.6,36.5-29.5-29.4c-24.7,18.9-54.4,31.7-86.7,36v42.4h-51.3v-42.7c-31.5-4.6-60.4-17.2-84.6-35.7l-31.6,31.5-36.6-36.5 32.4-31.3c-17.9-24-30-52.4-34.4-83.4h-45.3v-51.1h44l1.5-3.6c4.7-29.7 16.5-57.1 33.6-80.3l-32-31.9 36.6-36.5 31,31.9c24-18.5 52.8-31.2 84.1-36v-42.7h51.3v42.3c32,4.1 61.3,16.4 86,34.8l30.3-30.1 35.6,36.5-29.6,29.5c18.2,23.8 30.7,52.2 35.5,83.1h45.4v51.1h-44.7c-3.9,31.8-16.1,61.1-34.3,85.8z" />
  <path d="m257,143.4c-61.8,0-113.1,50-113.1,112.6s51.4,112.6 113.1,112.6 113.1-51.1 113.1-112.6-51.3-112.6-113.1-112.6zm0,204.3c-51.3,0-92.1-40.7-92.1-91.7 0-51.1 41.9-91.7 92.1-91.7s92.1,40.7 92.1,91.7c0.1,51.1-41.8,91.7-92.1,91.7z" />
</svg>
                Settings
              </a>
              <a
                href={`${import.meta.env.BASE_URL}user/settings/`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--code-bg)] px-4 text-sm font-semibold text-[var(--text-h)] no-underline transition-colors hover:bg-[var(--accent-bg)]"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M12 3v12"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <path
                    d="m7 10 5 5 5-5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <rect
                    x="4"
                    y="17"
                    width="16"
                    height="3"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
                Import progress
              </a>
              <a
                href={`${import.meta.env.BASE_URL}user/pokedex/`}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--code-bg)] px-4 text-sm font-semibold text-[var(--text-h)] no-underline transition-colors hover:bg-[var(--accent-bg)]"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M4 16.5V20h3.5L18.9 8.6l-3.5-3.5L4 16.5Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="m13.9 6.1 3.5 3.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                Edit current dex
              </a>
            </div>
          </section>

          <section className="rounded-2xl bg-[var(--bg)] p-5 shadow-sm">
            <p className="m-0 text-xs font-semibold tracking-wide text-[var(--text)] uppercase">
              Share profile
            </p>
            <h2 className="m-0 mt-2 text-xl font-semibold text-[var(--text-h)]">
              Show your collection
            </h2>
            <p className="mb-0 mt-2 text-sm text-[var(--text)]">
              Copy your link or open your public profile to preview how it
              looks.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  void copyShareLink();
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--code-bg)] px-4 text-sm font-semibold text-[var(--text-h)] transition-colors hover:bg-[var(--accent-bg)]"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect
                    x="9"
                    y="9"
                    width="11"
                    height="11"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <rect
                    x="4"
                    y="4"
                    width="11"
                    height="11"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
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
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--code-bg)] px-4 text-sm font-semibold text-[var(--text-h)] no-underline transition-colors hover:bg-[var(--accent-bg)]"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M14 4h6v6"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M10 14 20 4"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Open shared profile
                  </a>
                );
              })()}
            </div>
            {shareStatus ? (
              <p className="mb-0 mt-3 text-xs text-[var(--text)]">
                {shareStatus}
              </p>
            ) : null}
          </section>
        </aside>
      </section>

      <section className="pt-2">
        <h2 className="m-0 mt-2 text-2xl font-semibold text-[var(--text-h)]">
          Category groups and remaining Pokemon
        </h2>
        <p className="mb-0 mt-2 text-sm text-[var(--text)]">
          See where your biggest gaps are across types, regions, evolution
          stages, moves, and abilities.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-4">
          {categoryProgress.map((group) => (
            <div
              key={group.key}
              className={`rounded-2xl bg-[var(--code-bg)]/85 p-3 shadow-sm ${group.key === "move" || group.key === "types" ? "lg:col-span-2" : ""}`}
            >
              <h3 className="m-0 text-sm font-semibold text-[var(--text-h)]">
                {group.label}
              </h3>
              <div
                className={
                  group.key === "move" || group.key === "types"
                    ? "mt-2 grid gap-1.5 sm:grid-cols-2"
                    : "mt-2 space-y-1.5"
                }
              >
                {group.options.map((option) => {
                  const completed = option.total - option.remaining;
                  const completionPercent =
                    option.total > 0
                      ? Math.round((completed / option.total) * 100)
                      : 0;

                  return (
                    <div
                      key={`${group.key}:${option.name}`}
                      className="rounded-lg bg-[var(--bg)]/75 px-2.5 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <CategoryBadgeLink
                          parsed={{
                            raw: `${group.key}:${option.name}`,
                            type: group.key,
                            label: option.name,
                          }}
                          href={getCategoryHref(group.key, option.name)}
                        />
                        <p className="m-0 text-[11px] font-semibold text-[var(--text)]">
                          {option.remaining} left / {option.total}
                        </p>
                      </div>
                      <progress
                        value={completionPercent}
                        max={100}
                        className={`mt-1 h-1 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-[var(--code-bg)]/80 [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:rounded-full ${getProgressColorClass(completionPercent)}`}
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
