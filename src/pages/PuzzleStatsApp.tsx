import { useEffect, useMemo, useState } from "react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { trackEvent } from "../utils/analytics";
import { CATEGORY_COLORS, EVOLUTION_COLORS, REGION_COLORS, TYPE_COLORS } from "../utils/constants";
import "./App.css";
import "../index.css";

interface CategoryCount {
  categoryId: string;
  count: number;
}

interface CategoryPair {
  categories: [string, string];
  count: number;
}

interface PuzzleStatsResponse {
  puzzlesAnalyzed: number;
  dateRange: {
    from: string;
    to: string;
  };
  categoryCounts: CategoryCount[];
  categoryPairs: CategoryPair[];
}

interface ParsedCategory {
  raw: string;
  type: string;
  label: string;
}

interface PairFrequencyBucket {
  key: string;
  label: string;
  min: number;
  max: number | null;
  color: string;
}

const CATEGORY_TYPE_LABELS: Record<string, string> = {
  types: "Types",
  regions: "Regions",
  evolution: "Evolution",
  category: "Category",
  ability: "Ability",
  move: "Move",
};

const CATEGORY_TYPE_COLORS: Record<string, string> = {
  types: "#0f766e",
  regions: "#0369a1",
  evolution: "#16a34a",
  category: "#ca8a04",
  other: "#64748b",
};

const PAIR_FREQUENCY_BUCKETS: PairFrequencyBucket[] = [
  { key: "once", label: "1 time", min: 1, max: 1, color: "#7c3aed" },
  { key: "twoToNine", label: "2-9 times", min: 2, max: 9, color: "#2563eb" },
  { key: "fiveToNineteen", label: "10-19 times", min: 10, max: 19, color: "#eab308" },
  { key: "twentyToTwentyNine", label: "20-29 times", min: 20, max: 29, color: "#f97316" },
  { key: "thirtyPlus", label: "30+ times", min: 30, max: null, color: "#ef4444" },
];

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function parseCategoryId(categoryId: string): ParsedCategory {
  const separatorIndex = categoryId.indexOf(":");
  if (separatorIndex === -1) {
    return {
      raw: categoryId,
      type: "other",
      label: categoryId,
    };
  }

  const type = categoryId.slice(0, separatorIndex);
  const label = categoryId.slice(separatorIndex + 1);

  return {
    raw: categoryId,
    type,
    label,
  };
}

function topByCount<T>(items: T[], getCount: (item: T) => number, getLabel: (item: T) => string): T[] {
  return [...items]
    .sort((a, b) => getCount(b) - getCount(a) || getLabel(a).localeCompare(getLabel(b)))
    .slice(0, 5);
}

function bottomByCount<T>(items: T[], getCount: (item: T) => number, getLabel: (item: T) => string): T[] {
  return [...items]
    .sort((a, b) => getCount(a) - getCount(b) || getLabel(a).localeCompare(getLabel(b)))
    .slice(0, 5);
}

function getCategoryBarColor(parsed: ParsedCategory): string {
  if (parsed.type === "types") return TYPE_COLORS[parsed.label] ?? "#0f766e";
  if (parsed.type === "regions") return REGION_COLORS[parsed.label] ?? "#0f766e";
  if (parsed.type === "evolution") return EVOLUTION_COLORS[parsed.label] ?? "#0f766e";
  if (parsed.type === "category") return CATEGORY_COLORS[parsed.label] ?? "#0f766e";
  return "#0f766e";
}

function CategoryList({
  items,
  showDistributionBar = false,
  distributionTotal,
}: {
  items: CategoryCount[];
  showDistributionBar?: boolean;
  distributionTotal?: number;
}) {
  const maxCount = showDistributionBar ? Math.max(...items.map((item) => item.count), 0) : 0;

  return (
    <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
      {items.map((item) => {
        const parsed = parseCategoryId(item.categoryId);
        const typeLabel = CATEGORY_TYPE_LABELS[parsed.type] ?? "Other";
        const percent = showDistributionBar && distributionTotal && distributionTotal > 0 ? (item.count / distributionTotal) * 100 : 0;
        const barWidthPercent = showDistributionBar && maxCount > 0 ? (item.count / maxCount) * 100 : 0;
        const barColor = showDistributionBar ? getCategoryBarColor(parsed) : "#0f766e";
        const barWidth = item.count > 0 ? `max(${barWidthPercent}%, 8px)` : "0%";

        return (
          <li key={item.categoryId} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-800">{parsed.label}</p>
              <p className="text-xs text-slate-500">{typeLabel}</p>
              {showDistributionBar ? (
                <div className="mt-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full" style={{ width: barWidth, backgroundColor: barColor }} />
                  </div>
                </div>
              ) : null}
            </div>
            <div className="shrink-0 text-right">
              <span className="text-lg font-semibold text-slate-800">{item.count}</span>
              {showDistributionBar ? <p className="text-xs text-slate-500">{percent.toFixed(1)}%</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function PairList({ items }: { items: CategoryPair[] }) {
  return (
    <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
      {items.map((item) => {
        const left = parseCategoryId(item.categories[0]);
        const right = parseCategoryId(item.categories[1]);

        return (
          <li key={`${item.categories[0]}||${item.categories[1]}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="min-w-0 text-slate-700">
              <span className="font-semibold text-slate-800">{left.label}</span>
              <span className="mx-1 text-slate-400">+</span>
              <span className="font-semibold text-slate-800">{right.label}</span>
            </p>
            <span className="shrink-0 text-lg font-semibold text-slate-800">{item.count}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function PuzzleStatsApp() {
  const [stats, setStats] = useState<PuzzleStatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackEvent("view_puzzle_stats_page");

    fetch("/data/puzzle-stats.json?t=" + Date.now())
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load puzzle statistics");
        }
        return res.json() as Promise<PuzzleStatsResponse>;
      })
      .then((data) => setStats(data))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
      });
  }, []);

  const derived = useMemo(() => {
    if (!stats) return null;

    const mostCommonCategories = topByCount(
      stats.categoryCounts,
      (item) => item.count,
      (item) => item.categoryId,
    );

    const leastCommonCategories = bottomByCount(
      stats.categoryCounts,
      (item) => item.count,
      (item) => item.categoryId,
    );

    const pairLabel = (pair: CategoryPair) => `${pair.categories[0]}||${pair.categories[1]}`;

    const mostCommonPairs = topByCount(stats.categoryPairs, (item) => item.count, pairLabel);
    const leastCommonPairs = bottomByCount(stats.categoryPairs, (item) => item.count, pairLabel);

    const totalPairCombinations = stats.categoryPairs.length;
    const totalPairOccurrences = stats.categoryPairs.reduce((sum, item) => sum + item.count, 0);

    const pairFrequencyDistribution = PAIR_FREQUENCY_BUCKETS.map((bucket) => {
      const combos = stats.categoryPairs.filter((pair) => pair.count >= bucket.min && (bucket.max === null || pair.count <= bucket.max));
      const comboCount = combos.length;
      const occurrenceCount = combos.reduce((sum, pair) => sum + pair.count, 0);

      return {
        ...bucket,
        comboCount,
        occurrenceCount,
        comboPercent: totalPairCombinations > 0 ? (comboCount / totalPairCombinations) * 100 : 0,
      };
    });

    let runningPairPercent = 0;
    const pairFrequencyConicGradient =
      pairFrequencyDistribution.some((bucket) => bucket.comboCount > 0)
        ? `conic-gradient(${pairFrequencyDistribution
            .filter((bucket) => bucket.comboCount > 0)
            .map((bucket) => {
              const start = runningPairPercent;
              runningPairPercent += bucket.comboPercent;
              const end = runningPairPercent;
              return `${bucket.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
            })
            .join(", ")})`
        : "conic-gradient(#e2e8f0 0% 100%)";

    const typeTotals = new Map<string, number>();
    for (const item of stats.categoryCounts) {
      const parsed = parseCategoryId(item.categoryId);
      if (parsed.type === "category") continue;
      typeTotals.set(parsed.type, (typeTotals.get(parsed.type) ?? 0) + item.count);
    }

    const total = stats.categoryCounts.reduce((sum, item) => sum + item.count, 0);

    const categoryTypeBreakdown = Array.from(typeTotals.entries())
      .map(([type, count]) => ({
        type,
        label: CATEGORY_TYPE_LABELS[type] ?? "Other",
        count,
        percent: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    const categoryTypeTotal = categoryTypeBreakdown.reduce((sum, item) => sum + item.count, 0);

    let runningPercent = 0;
    const categoryTypeConicGradient =
      categoryTypeBreakdown.length > 0
        ? `conic-gradient(${categoryTypeBreakdown
            .map((item) => {
              const start = runningPercent;
              runningPercent += item.percent;
              const end = runningPercent;
              const color = CATEGORY_TYPE_COLORS[item.type] ?? CATEGORY_TYPE_COLORS.other;
              return `${color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
            })
            .join(", ")})`
        : "conic-gradient(#e2e8f0 0% 100%)";

    return {
      mostCommonCategories,
      leastCommonCategories,
      mostCommonPairs,
      leastCommonPairs,
      categoryTypeBreakdown,
      categoryTypeTotal,
      categoryTypeConicGradient,
      totalCategoryCount: total,
      totalPairCombinations,
      totalPairOccurrences,
      pairFrequencyDistribution,
      pairFrequencyConicGradient,
    };
  }, [stats]);

  if (error) {
    return (
      <div className="app loading">
        <p>Failed to load puzzle stats: {error}</p>
      </div>
    );
  }

  if (!stats || !derived) {
    return (
      <div className="app loading">
        <p>Loading puzzle stats...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        title="Puzzle Stats"
        subtitle="Explore historical category trends across past Pokedoku puzzles."
        currentPage="puzzle-stats"
      />

      <section className="mb-5 grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm">
          <p className="text-sm text-slate-500">Puzzles analyzed</p>
          <p className="text-3xl font-bold text-slate-900">{stats.puzzlesAnalyzed}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm">
          <p className="text-sm text-slate-500">Date range</p>
          <p className="text-lg font-semibold text-slate-900">
            {formatDate(stats.dateRange.from)} - {formatDate(stats.dateRange.to)}
          </p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
          <h2 className="mb-3 text-xl">Most common categories (top 5)</h2>
          <CategoryList items={derived.mostCommonCategories} showDistributionBar distributionTotal={derived.totalCategoryCount} />
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
          <h2 className="mb-3 text-xl">Least common categories (top 5)</h2>
          <CategoryList items={derived.leastCommonCategories} showDistributionBar distributionTotal={derived.totalCategoryCount} />
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
          <h2 className="mb-3 text-xl">Most common category pairs (top 5)</h2>
          <PairList items={derived.mostCommonPairs} />
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
          <h2 className="mb-3 text-xl">Combination frequency distribution</h2>
          <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-center">
            <div className="mx-auto">
              <div
                aria-label={derived.pairFrequencyDistribution
                  .filter((bucket) => bucket.comboCount > 0)
                  .map((bucket) => `${bucket.label}: ${bucket.comboPercent.toFixed(1)}%`)
                  .join(", ")}
                className="relative h-48 w-48 rounded-full"
                role="img"
                style={{ background: derived.pairFrequencyConicGradient }}
              >
                <div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unique pairs</p>
                  <p className="text-2xl font-bold text-slate-900">{derived.totalPairCombinations}</p>
                </div>
              </div>
            </div>

            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {derived.pairFrequencyDistribution.map((bucket) => (
                <li key={bucket.key} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="flex items-center gap-2 font-semibold text-slate-800">
                      <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: bucket.color }} />
                      {bucket.label}
                    </p>
                    <p className="text-sm text-slate-600">{bucket.comboPercent.toFixed(1)}%</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </article>
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
        <h2 className="mb-3 text-xl">Category type breakdown</h2>
        <div className="grid gap-4 md:grid-cols-[240px_1fr] md:items-center">
          <div className="mx-auto">
            <div
              aria-label={derived.categoryTypeBreakdown
                .map((item) => `${item.label}: ${item.percent.toFixed(1)}%`)
                .join(", ")}
              className="relative h-52 w-52 rounded-full"
              role="img"
              style={{ background: derived.categoryTypeConicGradient }}
            >
              <div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category Types</p>
                <p className="text-2xl font-bold text-slate-900">{derived.categoryTypeTotal}</p>
              </div>
            </div>
          </div>

          <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
            {derived.categoryTypeBreakdown.map((item) => {
              const color = CATEGORY_TYPE_COLORS[item.type] ?? CATEGORY_TYPE_COLORS.other;
              return (
                <li key={item.type} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <p className="flex items-center gap-2 font-semibold text-slate-800">
                    <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                    {item.label}
                  </p>
                  <p className="text-right text-slate-700">
                    {item.count} <span className="text-sm text-slate-500">({item.percent.toFixed(1)}%)</span>
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <Footer />
    </div>
  );
}
