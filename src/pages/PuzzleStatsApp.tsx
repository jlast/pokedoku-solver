import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { trackEvent } from "../utils/analytics";
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

const CATEGORY_TYPE_LABELS: Record<string, string> = {
  types: "Types",
  regions: "Regions",
  evolution: "Evolution",
  category: "Category",
  ability: "Ability",
  move: "Move",
};

const CHART_COLORS = ["#1e40af", "#dc2626", "#16a34a", "#d97706", "#7c3aed", "#06b6d4", "#ec4899"];

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

function CategoryList({ items }: { items: CategoryCount[] }) {
  return (
    <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
      {items.map((item) => {
        const parsed = parseCategoryId(item.categoryId);
        const typeLabel = CATEGORY_TYPE_LABELS[parsed.type] ?? "Other";

        return (
          <li key={item.categoryId} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-800">{parsed.label}</p>
              <p className="text-xs text-slate-500">{typeLabel}</p>
            </div>
            <span className="shrink-0 text-lg font-semibold text-slate-800">{item.count}</span>
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

    const typeTotals = new Map<string, number>();
    for (const item of stats.categoryCounts) {
      const parsed = parseCategoryId(item.categoryId);
      typeTotals.set(parsed.type, (typeTotals.get(parsed.type) ?? 0) + item.count);
    }

    const total = stats.categoryCounts.reduce((sum, item) => sum + item.count, 0);

    const categoryTypeBreakdown = Array.from(typeTotals.entries())
      .map(([type, count]) => ({
        type,
        name: CATEGORY_TYPE_LABELS[type] ?? "Other",
        value: count,
        percent: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));

    return {
      mostCommonCategories,
      leastCommonCategories,
      mostCommonPairs,
      leastCommonPairs,
      categoryTypeBreakdown,
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
          <CategoryList items={derived.mostCommonCategories} />
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
          <h2 className="mb-3 text-xl">Least common categories (top 5)</h2>
          <CategoryList items={derived.leastCommonCategories} />
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
          <h2 className="mb-3 text-xl">Most common category pairs (top 5)</h2>
          <PairList items={derived.mostCommonPairs} />
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
          <h2 className="mb-3 text-xl">Least common category pairs (top 5)</h2>
          <PairList items={derived.leastCommonPairs} />
        </article>
      </section>

      <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
        <h2 className="mb-3 text-xl">Category type break down</h2>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={derived.categoryTypeBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {derived.categoryTypeBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value}`, "Count"]}
                  labelFormatter={(label: string) => `Category: ${label}`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1">
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {derived.categoryTypeBreakdown.map((item, index) => (
                <li key={item.type} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <p className="font-semibold text-slate-800">{item.name}</p>
                  </div>
                  <p className="text-right text-slate-700">
                    {item.value} <span className="text-sm text-slate-500">({item.percent.toFixed(1)}%)</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
