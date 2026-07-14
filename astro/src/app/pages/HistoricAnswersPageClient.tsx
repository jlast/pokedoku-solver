import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { getRemoteUserPuzzles } from "@pokedoku-helper/user-api-client";
import { trackEvent } from "../../../../lib/browser/analytics";
import { formatDate } from "../../../../lib/shared/utils";
import { getCategoryOptionSlug } from "@pokedoku-helper/shared-types";
import { CategoryBadgeLink } from "../components/shared/CategoryBadgeLink";
import { DateChip } from "../components/shared/DateChip";
import { parseCategoryId } from "../components/puzzle-stats/categoryUtils";
import { SectionCard } from "../components/shared/SectionCard";
import { DifficultyBadge } from "../components/today-board-suggestions/DifficultyBadge";
import type { ArchivePuzzle } from "../../lib/puzzleArchive";
import { getPuzzleArchiveHref, isBonusPuzzle } from "../../lib/puzzleArchive";
import { getSessionUserProfile, getValidSessionIdToken } from "../../lib/cognitoAuth";
import { getApiBaseUrl } from "../lib/pokedexSettings";

type PuzzleFilter = "all" | "regular" | "bonus";
const INITIAL_VISIBLE_COUNT = 24;
const VISIBLE_COUNT_STEP = 24;

function toBadgeCategory(category: string): string {
  if (category === "type") return "types";
  if (category === "region") return "regions";
  return category;
}

function getCategoryHref(category: string, value: string): string | null {
  const normalizedCategory = toBadgeCategory(category);
  if (!["types", "regions", "evolution", "category", "move", "ability"].includes(normalizedCategory)) {
    return null;
  }

  return `/tools/category/${getCategoryOptionSlug(normalizedCategory, value)}/`;
}

function getPuzzleLabel(puzzle: ArchivePuzzle): string {
  return isBonusPuzzle(puzzle) ? "Bonus puzzle" : "Daily puzzle";
}

function getSearchText(puzzle: ArchivePuzzle): string {
  const constraintLabels = [...puzzle.rowConstraints, ...puzzle.colConstraints].map((constraint) => constraint.value.toLowerCase());
  const featuredPickLabel = puzzle.featuredPick?.name?.toLowerCase() ?? "";
  return [puzzle.date, getPuzzleLabel(puzzle).toLowerCase(), featuredPickLabel, ...constraintLabels].join(" ");
}

function getResultSummary(filteredCount: number, totalCount: number, hasActiveFilters: boolean): string {
  if (!hasActiveFilters) {
    return `${totalCount} boards`;
  }

  return `Showing ${filteredCount} of ${totalCount} boards`;
}

export function HistoricAnswersPageClient() {
  const isLoggedIn = typeof window !== "undefined" && Boolean(getSessionUserProfile());
  const [items, setItems] = useState<ArchivePuzzle[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PuzzleFilter>("all");
  const [isArchiveLoading, setIsArchiveLoading] = useState(true);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [savedPuzzleKeys, setSavedPuzzleKeys] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const deferredQuery = useDeferredValue(query);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  function updateQuery(nextQuery: string): void {
    setQuery(nextQuery);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }

  function updateFilter(nextFilter: PuzzleFilter): void {
    setFilter(nextFilter);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }

  useEffect(() => {
    let active = true;

    trackEvent('page_view', { page_name: 'historic_answers' });

    fetch(`${import.meta.env.BASE_URL}data/runtime/puzzle-archive-index.json?t=${Date.now()}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load historic puzzle archive");
        }

        const data = (await response.json()) as { items?: ArchivePuzzle[] };
        if (!active) return;

        const nextItems = Array.isArray(data.items) ? data.items : [];
        setItems(nextItems);
        setArchiveError(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setArchiveError(error instanceof Error ? error.message : "Failed to load historic puzzle archive");
      })
      .finally(() => {
        if (active) setIsArchiveLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    let active = true;
    void (async () => {
      const token = await getValidSessionIdToken();
      const apiBaseUrl = getApiBaseUrl();
      if (!token || !apiBaseUrl) return;

      const savedPuzzles = await getRemoteUserPuzzles({ token, apiBaseUrl });
      if (!active || !savedPuzzles) return;

      setSavedPuzzleKeys(new Set(savedPuzzles.filter((puzzle) => puzzle.answers.length > 0).map((puzzle) => puzzle.puzzleKey)));
    })();

    return () => {
      active = false;
    };
  }, [isLoggedIn]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return items.filter((puzzle) => {
      if (filter === "regular" && isBonusPuzzle(puzzle)) return false;
      if (filter === "bonus" && !isBonusPuzzle(puzzle)) return false;
      if (!normalizedQuery) return true;
      return getSearchText(puzzle).includes(normalizedQuery);
    });
  }, [deferredQuery, filter, items]);

  const summary = useMemo(() => {
    const bonusCount = items.filter((item) => isBonusPuzzle(item)).length;
    return {
      total: items.length,
      bonus: bonusCount,
      regular: items.length - bonusCount,
    };
  }, [items]);

  const hasActiveFilters = filter !== "all" || query.trim().length > 0;
  const resultSummary = getResultSummary(filteredItems.length, items.length, hasActiveFilters);
  const visibleItems = filteredItems.slice(0, visibleCount);
  const hasMoreItems = visibleItems.length < filteredItems.length;

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMoreItems) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setVisibleCount((current) => Math.min(current + VISIBLE_COUNT_STEP, filteredItems.length));
      },
      { rootMargin: "400px 0px" },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [filteredItems.length, hasMoreItems]);

  return (
    <>
      <section className="mb-4 grid gap-2 sm:grid-cols-3">
        <article className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2 text-left shadow-[0_10px_22px_rgba(15,23,42,0.05)]">
          <p className="m-0 text-xs uppercase tracking-wide text-[var(--text)]">Historic boards</p>
          <p className="m-0 text-2xl font-bold text-[var(--text-h)]">{summary.total}</p>
        </article>
        <article className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2 text-left shadow-[0_10px_22px_rgba(15,23,42,0.05)]">
          <p className="m-0 text-xs uppercase tracking-wide text-[var(--text)]">Daily puzzles</p>
          <p className="m-0 text-2xl font-bold text-[var(--text-h)]">{summary.regular}</p>
        </article>
        <article className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2 text-left shadow-[0_10px_22px_rgba(15,23,42,0.05)]">
          <p className="m-0 text-xs uppercase tracking-wide text-[var(--text)]">Bonus puzzles</p>
          <p className="m-0 text-2xl font-bold text-[var(--text-h)]">{summary.bonus}</p>
        </article>
      </section>

      <SectionCard title="Browse the archive" subtitle="Search by date, category, or featured Pokemon." className="rounded-2xl p-3.5">
        {archiveError ? <p className="mb-3 mt-0 text-sm text-red-600">{archiveError}</p> : null}
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <label className="block flex-1">
            <span className="sr-only">Search historic answers</span>
            <input
              type="search"
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              placeholder="Search by date, type, region, category, or Pokemon..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2 text-sm text-[var(--text-h)] placeholder:text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-end">
            <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--bg)] p-1">
              {([
                ["all", "All"],
                ["regular", "Daily"],
                ["bonus", "Bonus"],
              ] as const).map(([value, label]) => {
                const active = filter === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateFilter(value)}
                    className={`rounded-lg px-3 py-1 text-sm transition-colors ${active ? "bg-slate-700 text-white" : "text-[var(--text)]"}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="text-sm text-[var(--text)] lg:text-right">
              <strong className="text-[var(--text-h)]">{resultSummary}</strong>
            </div>
          </div>
        </div>
      </SectionCard>

      <section className="mt-4 grid gap-2.5 lg:grid-cols-2 2xl:grid-cols-3">
        {isArchiveLoading ? (
          <article className="rounded-3xl border border-[var(--border)] bg-[var(--bg)] p-3.5 shadow-[0_10px_22px_rgba(15,23,42,0.05)]">
            <p className="m-0 text-sm text-[var(--text)]">Loading historic boards...</p>
          </article>
        ) : null}

        {visibleItems.map((puzzle) => {
          const hasSavedPuzzle = savedPuzzleKeys.has(puzzle.slug);

          return (
          <article key={puzzle.slug} className={`rounded-[22px] border p-3.5 shadow-[0_10px_22px_rgba(15,23,42,0.05)] ${hasSavedPuzzle ? "border-emerald-300 bg-emerald-50 [html[data-theme='dark']_&]:border-emerald-500/70 [html[data-theme='dark']_&]:bg-emerald-950/20" : "border-[var(--border)] bg-[var(--bg)]"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DateChip date={formatDate(puzzle.date)} className="px-2.5 py-1 text-xs" />
                <p className="m-0 mt-1.5 text-sm text-[var(--text)]">{getPuzzleLabel(puzzle)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2 self-start">
                {hasSavedPuzzle ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-200 px-2 py-0.5 text-[11px] font-bold uppercase leading-4 text-emerald-950 [html[data-theme='dark']_&]:border-emerald-500 [html[data-theme='dark']_&]:bg-emerald-900/40 [html[data-theme='dark']_&]:text-emerald-100">
                    <span aria-hidden="true">✓</span>
                    <span>New entry</span>
                  </span>
                ) : null}
                {isBonusPuzzle(puzzle) ? (
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold bg-violet-100 text-violet-700 [html[data-theme='dark']_&]:bg-violet-950/40 [html[data-theme='dark']_&]:text-violet-200">
                    Bonus
                  </span>
                ) : null}
                <a
                  href={getPuzzleArchiveHref(puzzle)}
                  aria-label={`View board from ${formatDate(puzzle.date)}`}
                  onClick={() =>
                    trackEvent('content_open', {
                      page_name: 'historic_answers',
                      location: 'historic_answers',
                      source: 'link',
                      target: 'historic_answer',
                      value: puzzle.slug,
                    })
                  }
                  className="inline-flex items-center rounded-lg border border-red-700 bg-red-600 px-2.5 py-1 text-xs font-semibold text-white no-underline transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                >
                  <svg className="mr-1 h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  View
                </a>
              </div>
            </div>

            <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl bg-[var(--code-bg)] px-2.5 py-2">
                <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--text)]">Rows</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {puzzle.rowConstraints.map((constraint) => (
                    <CategoryBadgeLink
                      key={`${puzzle.slug}-row-${constraint.category}-${constraint.value}`}
                      parsed={parseCategoryId(`${toBadgeCategory(constraint.category)}:${constraint.value}`)}
                      href={getCategoryHref(constraint.category, constraint.value)}
                      compact
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-[var(--code-bg)] px-2.5 py-2">
                <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--text)]">Columns</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {puzzle.colConstraints.map((constraint) => (
                    <CategoryBadgeLink
                      key={`${puzzle.slug}-col-${constraint.category}-${constraint.value}`}
                      parsed={parseCategoryId(`${toBadgeCategory(constraint.category)}:${constraint.value}`)}
                      href={getCategoryHref(constraint.category, constraint.value)}
                      compact
                    />
                  ))}
                </div>
              </div>
            </div>

            {puzzle.featuredPick ? (
              <div className="mt-2.5 flex items-center gap-2.5 rounded-xl bg-[var(--code-bg)] px-2.5 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  {puzzle.featuredPick.sprite ? (
                    <img src={puzzle.featuredPick.sprite} alt="" className="h-9 w-9 object-contain" loading="lazy" decoding="async" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-[var(--bg)]" aria-hidden="true" />
                  )}
                  <div className="min-w-0">
                    <p className="m-0 truncate text-sm font-semibold text-[var(--text-h)]">{puzzle.featuredPick.name}</p>
                    <p className="m-0 text-[11px] text-[var(--text)]">
                      {puzzle.featuredPick.globalCategoryCombinationCount} combo groups
                    </p>
                  </div>
                </div>
                <div className="ml-auto shrink-0">
                  <DifficultyBadge difficulty={puzzle.featuredPick.dexDifficulty} />
                </div>
              </div>
            ) : null}
          </article>
          );
        })}
      </section>

      {hasMoreItems ? <div ref={loadMoreRef} className="h-8" aria-hidden="true" /> : null}

      {filteredItems.length === 0 ? (
        <section className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--bg)] p-8 text-center shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
          <h2 className="m-0 text-2xl font-bold text-[var(--text-h)]">No boards matched</h2>
          <p className="mt-2 mb-0 text-[var(--text)]">Try a different date, category, or filter.</p>
        </section>
      ) : null}
    </>
  );
}
