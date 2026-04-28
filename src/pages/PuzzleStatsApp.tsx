import { useEffect, useMemo, useState } from "react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { DonutChart } from "../components/charts/DonutChart";
import { CategoryList, type CategoryCount } from "../components/puzzle-stats/CategoryList";
import { PairList, type CategoryPair } from "../components/puzzle-stats/PairList";
import { parseCategoryId } from "../components/puzzle-stats/categoryUtils";
import { trackEvent } from "../utils/analytics";
import { CATEGORY_TYPE_COLORS, CATEGORY_TYPE_LABELS } from "../utils/constants";
import "./App.css";
import "../index.css";

interface PuzzleStatsResponse {
  puzzlesAnalyzed: number;
  dateRange: {
    from: string;
    to: string;
  };
  categoryCounts: CategoryCount[];
  categoryPairs: CategoryPair[];
}


interface PairFrequencyBucket {
  key: string;
  label: string;
  min: number;
  max: number | null;
  color: string;
}

const PAIR_FREQUENCY_BUCKETS: PairFrequencyBucket[] = [
  { key: "once", label: "1 time", min: 1, max: 1, color: "#7c3aed" },
  { key: "twoToNine", label: "2-9 times", min: 2, max: 9, color: "#2563eb" },
  { key: "fiveToNineteen", label: "10-19 times", min: 10, max: 19, color: "#eab308" },
  { key: "twenty+", label: "20+ times", min: 20, max: null, color: "#f97316" },
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


export default function PuzzleStatsApp() {
  const [stats, setStats] = useState<PuzzleStatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackEvent("view_puzzle_stats_page");

    fetch("/data/runtime/puzzle-stats.json?t=" + Date.now())
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

    return {
      mostCommonCategories,
      leastCommonCategories,
      mostCommonPairs,
      leastCommonPairs,
      categoryTypeBreakdown,
      categoryTypeTotal,
      totalCategoryCount: total,
      totalPairCombinations,
      totalPairOccurrences,
      pairFrequencyDistribution,
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
          <p className="mb-2 text-sm text-slate-600">By number of puzzles</p>
          <CategoryList items={derived.mostCommonCategories} showDistributionBar distributionTotal={derived.totalCategoryCount} />
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
          <h2 className="mb-3 text-xl">Least common categories (top 5)</h2>
          <p className="mb-2 text-sm text-slate-600">By number of puzzles</p>
          <CategoryList items={derived.leastCommonCategories} showDistributionBar distributionTotal={derived.totalCategoryCount} maxBarWidthPercent={50} />
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
          <h2 className="mb-3 text-xl">Most common category pairs (top 5)</h2>
          <p className="mb-2 text-sm text-slate-600">By number of occurrences</p>
          <PairList items={derived.mostCommonPairs} showDistributionBar distributionTotal={derived.totalPairOccurrences} />
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
          <h2 className="mb-3 text-xl">Combination frequency distribution</h2>
          <p className="mb-2 text-sm text-slate-600">How often each unique category pair appears.</p>
          <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-center">
            <div className="mx-auto">
              <div className="relative h-48 w-48">
                <DonutChart
                  ariaLabel={derived.pairFrequencyDistribution
                    .filter((bucket) => bucket.comboCount > 0)
                    .map((bucket) => `${bucket.label}: ${bucket.comboPercent.toFixed(1)}%`)
                    .join(", ")}
                  segments={derived.pairFrequencyDistribution.map((bucket) => ({ value: bucket.comboCount, color: bucket.color }))}
                  size={192}
                />
                <div className="absolute inset-12 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
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
        <p className="mb-2 text-sm text-slate-600">How often each category type appears.</p>
        <div className="grid gap-4 md:grid-cols-[240px_1fr] md:items-center">
          <div className="mx-auto">
            <div className="relative h-52 w-52">
              <DonutChart
                ariaLabel={derived.categoryTypeBreakdown.map((item) => `${item.label}: ${item.percent.toFixed(1)}%`).join(", ")}
                segments={derived.categoryTypeBreakdown.map((item) => ({
                  value: item.count,
                  color: CATEGORY_TYPE_COLORS[item.type] ?? CATEGORY_TYPE_COLORS.other,
                }))}
                size={208}
              />
              <div className="absolute inset-12 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
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
