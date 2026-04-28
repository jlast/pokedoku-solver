import { useEffect, useMemo, useState } from "react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { DonutChart } from "../components/charts/DonutChart";
import { CategoryList, type CategoryCount } from "../components/puzzle-stats/CategoryList";
import { PairList, type CategoryPair } from "../components/puzzle-stats/PairList";
import { trackEvent } from "../utils/analytics";
import { CATEGORY_TYPE_COLORS, CATEGORY_TYPE_LABELS, TYPE_COLORS } from "../utils/constants";
import { PAIR_FREQUENCY_BUCKETS } from "../utils/pairFrequencyBuckets";
import "./App.css";
import "../index.css";

interface PuzzleStatsResponse {
  puzzlesAnalyzed: number;
  dateRange: {
    from: string;
    to: string;
  };
  topCategoryCounts: CategoryCount[];
  categoryTypeBreakdown: CategoryTypeSummary[];
  topCategoryPairs: CategoryPair[];
  pairFrequencyDistribution: PairFrequencyDistributionItem[];
  oldestPokemonLastUsable: PokemonLastUsable[];
}

interface PokemonLastUsable {
  formId: number;
  lastUsableDate: string | null;
  daysSinceLastUsable: number | null;
}

interface PokemonListEntry {
  formId?: number;
  name: string;
  sprite?: string;
  types?: string[];
}

interface CategoryTypeSummary {
  type: string;
  count: number;
}

interface PairFrequencyDistributionItem {
  key: string;
  label: string;
  min: number;
  max: number | null;
  comboCount: number;
  occurrenceCount: number;
}

function formatDate(value: string): string {
  const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = isoDateMatch
    ? new Date(Number(isoDateMatch[1]), Number(isoDateMatch[2]) - 1, Number(isoDateMatch[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}


export default function PuzzleStatsApp() {
  const [stats, setStats] = useState<PuzzleStatsResponse | null>(null);
  const [pokemonByFormId, setPokemonByFormId] = useState<Map<number, PokemonListEntry>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackEvent("view_puzzle_stats_page");

    Promise.all([
      fetch("/data/runtime/puzzle-stats.json?t=" + Date.now()),
      fetch("/data/pokemon.json?t=" + Date.now()),
    ])
      .then(async ([statsRes, pokemonRes]) => {
        if (!statsRes.ok) {
          throw new Error("Failed to load puzzle statistics");
        }
        if (!pokemonRes.ok) {
          throw new Error("Failed to load pokemon list");
        }

        const statsData = (await statsRes.json()) as PuzzleStatsResponse;
        const pokemonData = (await pokemonRes.json()) as PokemonListEntry[];
        const lookup = new Map<number, PokemonListEntry>();

        for (const entry of pokemonData) {
          if (typeof entry.formId === "number") {
            lookup.set(entry.formId, entry);
          }
        }

        trackEvent("puzzle_stats_loaded", {
          puzzlesAnalyzed: statsData.puzzlesAnalyzed,
          dateFrom: statsData.dateRange.from,
          dateTo: statsData.dateRange.to,
        });

        setPokemonByFormId(lookup);
        setStats(statsData);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Unknown error";
        trackEvent("puzzle_stats_load_error", { message });
        setError(message);
      });
  }, []);

  const derived = useMemo(() => {
    if (!stats) return null;

    const pairBucketColorByKey = new Map(PAIR_FREQUENCY_BUCKETS.map((bucket) => [bucket.key, bucket.color]));

    const totalPairCombinations = stats.pairFrequencyDistribution.reduce((sum, item) => sum + item.comboCount, 0);
    const totalPairOccurrences = stats.pairFrequencyDistribution.reduce((sum, item) => sum + item.occurrenceCount, 0);

    const pairFrequencyDistribution = stats.pairFrequencyDistribution.map((item) => ({
      ...item,
      color: pairBucketColorByKey.get(item.key) ?? "#64748b",
      comboPercent: totalPairCombinations > 0 ? (item.comboCount / totalPairCombinations) * 100 : 0,
    }));

    const categoryTypeTotal = stats.categoryTypeBreakdown.reduce((sum, item) => sum + item.count, 0);

    const categoryTypeBreakdown = stats.categoryTypeBreakdown
      .map((item) => ({
        ...item,
        label: CATEGORY_TYPE_LABELS[item.type] ?? "Other",
        percent: categoryTypeTotal > 0 ? (item.count / categoryTypeTotal) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    return {
      mostCommonCategories: stats.topCategoryCounts,
      oldestVisiblePokemon: stats.oldestPokemonLastUsable,
      mostCommonPairs: stats.topCategoryPairs,
      categoryTypeBreakdown,
      categoryTypeTotal,
      totalCategoryCount: stats.categoryTypeBreakdown.reduce((sum, item) => sum + item.count, 0),
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
        title="PokeDoku Rarity Stats"
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
          <h2 className="mb-3 text-xl">Waiting the Longest</h2>
          <p className="mb-2 text-sm text-slate-600">Pokémon still not usable after all this time</p>
          <ul className="m-0 grid list-none gap-2 p-0">
            {derived.oldestVisiblePokemon.map((item) => {
              const pokemon = pokemonByFormId.get(item.formId);
              return (
                <li key={item.formId} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-center gap-3">
                    {pokemon?.sprite ? (
                      <img src={pokemon.sprite} alt={pokemon.name} className="h-10 w-10 rounded-md" loading="lazy" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-500">#{item.formId}</div>
                    )}
                    <div>
                      <p className="m-0 font-semibold text-slate-900">{pokemon?.name ?? "Unknown Pokemon"}</p>
                      {pokemon?.types?.length ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {pokemon.types.map((type) => (
                            <span key={`${item.formId}-${type}`} className="type-badge" style={{ backgroundColor: TYPE_COLORS[type] }}>
                              {type}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="m-0 text-xs text-slate-500">Types: Unknown</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="m-0 text-sm font-semibold text-slate-800">
                      {item.lastUsableDate ? formatDate(item.lastUsableDate) : "Never"}
                    </p>
                    <p className="m-0 text-xs text-slate-500">
                      {item.daysSinceLastUsable === null ? "No match yet" : `${item.daysSinceLastUsable}d ago`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </article>
        
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
          <h2 className="mb-3 text-xl">Most common categories (top 5)</h2>
          <p className="mb-2 text-sm text-slate-600">By number of puzzles</p>
          <CategoryList items={derived.mostCommonCategories} showDistributionBar distributionTotal={derived.totalCategoryCount} />
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
