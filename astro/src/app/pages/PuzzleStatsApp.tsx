import { useEffect, useMemo, useState } from "react";
import { DonutChart } from "../components/charts/DonutChart";
import { CategoryList, type CategoryCount } from "../components/puzzle-stats/CategoryList";
import { PairList, type CategoryPair } from "../components/puzzle-stats/PairList";
import { CategoryBadgeLink } from "../components/shared/CategoryBadgeLink";
import { InfoTooltipIcon } from "../components/shared/InfoTooltipIcon";
import { SectionCard } from "../components/shared/SectionCard";
import { parseCategoryId } from "../components/puzzle-stats/categoryUtils";
import { slugify } from "../../lib/slug";
import { trackEvent } from "../../../../lib/browser/analytics";
import { CATEGORY_TYPE_COLORS, CATEGORY_TYPE_LABELS } from "../../../../lib/shared/constants";
import { FILTER_CATEGORIES } from "../../../../lib/shared/filters";
import { PAIR_FREQUENCY_BUCKETS } from "../../../../lib/shared/pairFrequencyBuckets";

interface PuzzleStatsResponse {
  puzzlesAnalyzed: number;
  dateRange: {
    from: string;
    to: string;
  };
  withoutLegacy: PuzzleStatsSection;
  withLegacy: PuzzleStatsSection;
}

interface PuzzleStatsSection {
  topCategoryCounts: CategoryCount[];
  leastCategoryCounts: CategoryCount[];
  categoryTypeBreakdown: CategoryTypeSummary[];
  topCategoryPairs: CategoryPair[];
  leastCategoryPairs: CategoryPair[];
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
  const [pokemonLoading, setPokemonLoading] = useState(true);
  const [leastUsedMode, setLeastUsedMode] = useState<"categories" | "pairs">("categories");
  const [mostUsedMode, setMostUsedMode] = useState<"categories" | "pairs">("categories");
  const [showLegacyFilters, setShowLegacyFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categorySlugSet = useMemo(
    () => new Set(FILTER_CATEGORIES.flatMap((filterCategory) => filterCategory.options.map((option) => slugify(option.name)))),
    [],
  );

  function getCategoryHref(label: string): string | null {
    const slug = slugify(label);
    return categorySlugSet.has(slug) ? `/tools/category/${slug}/` : null;
  }

  useEffect(() => {
    trackEvent("view_puzzle_stats_page");

    fetch("/data/runtime/puzzle-stats.json?t=" + Date.now())
      .then(async (statsRes) => {
        if (!statsRes.ok) {
          throw new Error("Failed to load puzzle statistics");
        }

        const statsData = (await statsRes.json()) as PuzzleStatsResponse;
        trackEvent("puzzle_stats_loaded", {
          puzzlesAnalyzed: statsData.puzzlesAnalyzed,
          dateFrom: statsData.dateRange.from,
          dateTo: statsData.dateRange.to,
        });
        setStats(statsData);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Unknown error";
        trackEvent("puzzle_stats_load_error", { message });
        setError(message);
      });

    fetch("/data/pokemon.json?t=" + Date.now())
      .then(async (pokemonRes) => {
        if (!pokemonRes.ok) {
          throw new Error("Failed to load pokemon list");
        }
        const pokemonData = (await pokemonRes.json()) as PokemonListEntry[];
        const lookup = new Map<number, PokemonListEntry>();
        for (const entry of pokemonData) {
          if (typeof entry.formId === "number") {
            lookup.set(entry.formId, entry);
          }
        }
        setPokemonByFormId(lookup);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Unknown error";
        trackEvent("puzzle_stats_pokemon_load_error", { message });
      })
      .finally(() => setPokemonLoading(false));
  }, []);

  const derived = useMemo(() => {
    if (!stats) return null;

    const pairBucketColorByKey = new Map(PAIR_FREQUENCY_BUCKETS.map((bucket) => [bucket.key, bucket.color]));

    const selectedStats = showLegacyFilters ? stats.withLegacy : stats.withoutLegacy;

    const totalPairCombinations = selectedStats.pairFrequencyDistribution.reduce((sum, item) => sum + item.comboCount, 0);
    const totalPairOccurrences = [...selectedStats.topCategoryPairs, ...selectedStats.leastCategoryPairs].reduce((sum, item) => sum + item.count, 0);

    const pairFrequencyDistribution = selectedStats.pairFrequencyDistribution.map((item) => ({
      ...item,
      color: pairBucketColorByKey.get(item.key) ?? "#64748b",
      comboPercent: totalPairCombinations > 0 ? (item.comboCount / totalPairCombinations) * 100 : 0,
    }));

    const categoryTypeTotal = selectedStats.categoryTypeBreakdown.reduce((sum, item) => sum + item.count, 0);

    const categoryTypeBreakdown = selectedStats.categoryTypeBreakdown
      .map((item) => ({
        ...item,
        label: CATEGORY_TYPE_LABELS[item.type] ?? "Other",
        percent: categoryTypeTotal > 0 ? (item.count / categoryTypeTotal) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    return {
      mostCommonCategories: selectedStats.topCategoryCounts,
      leastCommonCategories: selectedStats.leastCategoryCounts,
      oldestVisiblePokemon: selectedStats.oldestPokemonLastUsable,
      mostCommonPairs: selectedStats.topCategoryPairs,
      leastCommonPairs: selectedStats.leastCategoryPairs,
      categoryTypeBreakdown,
      categoryTypeTotal,
      totalCategoryCount: selectedStats.categoryTypeBreakdown.reduce((sum, item) => sum + item.count, 0),
      totalPairCombinations,
      totalPairOccurrences,
      pairFrequencyDistribution,
    };
  }, [showLegacyFilters, stats]);

  if (error) {
    return (
      <div className="min-h-screen p-5 text-center">
        <p>Failed to load puzzle stats: {error}</p>
      </div>
    );
  }

  if (!stats || !derived) {
    return (
      <div className="grid gap-4 lg:grid-cols-2" aria-label="Loading puzzle stats sections">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
          <div className="mb-3 h-6 w-60 animate-pulse rounded bg-slate-200" />
          <div className="mb-2 h-4 w-80 animate-pulse rounded bg-slate-100" />
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="h-14 animate-pulse rounded-lg border border-slate-200 bg-slate-50" />
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
          <div className="mb-3 h-6 w-44 animate-pulse rounded bg-slate-200" />
          <div className="mb-3 h-10 w-48 animate-pulse rounded-lg bg-slate-100" />
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="h-11 animate-pulse rounded-lg border border-slate-200 bg-slate-50" />
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
          <div className="mb-3 h-6 w-44 animate-pulse rounded bg-slate-200" />
          <div className="mb-3 h-10 w-48 animate-pulse rounded-lg bg-slate-100" />
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="h-11 animate-pulse rounded-lg border border-slate-200 bg-slate-50" />
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
          <div className="mb-3 h-6 w-56 animate-pulse rounded bg-slate-200" />
          <div className="h-52 animate-pulse rounded-lg bg-slate-100" />
        </article>
      </div>
    );
  }

  return (
    <>
      <section className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="m-0 text-sm font-semibold text-slate-800">Legacy filters</p>
            <p className="m-0 text-xs text-slate-500">Moves and abilities</p>
          </div>
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1">
            <button
              type="button"
              onClick={() => {
                setShowLegacyFilters(false);
                trackEvent("toggle_legacy_filters", { enabled: "off" });
              }}
              className={`rounded-md px-3 py-1 text-sm ${!showLegacyFilters ? "bg-slate-700 text-white" : "text-slate-700"}`}
            >
              Off
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLegacyFilters(true);
                trackEvent("toggle_legacy_filters", { enabled: "on" });
              }}
              className={`rounded-md px-3 py-1 text-sm ${showLegacyFilters ? "bg-slate-700 text-white" : "text-slate-700"}`}
            >
              On
            </button>
          </div>
        </div>
      </section>

      <section className="mb-5 grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
          <p className="text-sm text-slate-500">Puzzles analyzed</p>
          <p className="text-3xl font-bold text-slate-900">{stats.puzzlesAnalyzed}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
          <p className="text-sm text-slate-500">Date range</p>
          <p className="text-lg font-semibold text-slate-900">
            {formatDate(stats.dateRange.from)} - {formatDate(stats.dateRange.to)}
          </p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">

        <SectionCard title="When Was This Pokemon Last Valid?" className="text-left">
          <p className="mb-2 text-sm text-slate-600">Pokemon that have gone the longest without being usable in PokeDoku.</p>
          {pokemonLoading ? (
            <ul className="m-0 mb-3 grid list-none gap-2 p-0" aria-label="Loading Pokemon recency list">
              {[0, 1, 2, 3, 4].map((item) => (
                <li key={item} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 animate-pulse rounded-md bg-slate-200" />
                    <div className="space-y-1">
                      <div className="h-3.5 w-28 animate-pulse rounded bg-slate-200" />
                      <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
                    </div>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="h-3.5 w-20 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-14 animate-pulse rounded bg-slate-100" />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="m-0 grid list-none gap-2 p-0 mb-3">
              {derived.oldestVisiblePokemon.map((item) => {
                const pokemon = pokemonByFormId.get(item.formId);
                const pokemonSlug = pokemon ? `${slugify(pokemon.name)}-${pokemon.formId ?? pokemon.id}` : null;
                return (
                  <li key={item.formId} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-center gap-3">
                      {pokemonSlug ? (
                        <a href={`/pokemon/${pokemonSlug}/`} className="block">
                          {pokemon?.sprite ? (
                            <img src={pokemon.sprite} alt={pokemon.name} className="h-10 w-10 rounded-md" loading="lazy" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-500">#{item.formId}</div>
                          )}
                        </a>
                      ) : pokemon?.sprite ? (
                        <img src={pokemon.sprite} alt={pokemon.name} className="h-10 w-10 rounded-md" loading="lazy" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-500">#{item.formId}</div>
                      )}
                      <div>
                        <p className="m-0 font-semibold text-slate-900">
                          {pokemonSlug ? <a href={`/pokemon/${pokemonSlug}/`}>{pokemon?.name ?? "Unknown Pokemon"}</a> : (pokemon?.name ?? "Unknown Pokemon")}
                        </p>
                        {pokemon?.types?.length ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {pokemon.types.map((type) => (
                              <CategoryBadgeLink
                                key={`${item.formId}-${type}`}
                                parsed={parseCategoryId(`types:${type}`)}
                                href={getCategoryHref(type)}
                              />
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
          )}
          <div className="w-full flex justify-end">
            <a href="/pokemon-list/?sortBy=recent-appearance" className="underline text-sm text-slate-600">
                See all Pokemon
            </a>
          </div>
        </SectionCard>

        <SectionCard
          title={<span>Most used (top 5) <InfoTooltipIcon text="Shows how often this item appears in puzzles. Higher percentages mean you're more likely to encounter it." /></span>}
          className="text-left"
        >
          <div className="mb-3 inline-flex rounded-lg border border-slate-300 bg-white p-1">
            <button
              type="button"
              onClick={() => setMostUsedMode("categories")}
              className={`rounded-md px-3 py-1 text-sm ${mostUsedMode === "categories" ? "bg-slate-700 text-white" : "text-slate-700"}`}
            >
              Categories
            </button>
            <button
              type="button"
              onClick={() => setMostUsedMode("pairs")}
              className={`rounded-md px-3 py-1 text-sm ${mostUsedMode === "pairs" ? "bg-slate-700 text-white" : "text-slate-700"}`}
            >
              Pairs
            </button>
          </div>
          {mostUsedMode === "categories" ? (
            <CategoryList items={derived.mostCommonCategories} showDistributionBar distributionTotal={derived.totalCategoryCount} />
          ) : (
            <PairList items={derived.mostCommonPairs} showDistributionBar distributionTotal={derived.totalPairOccurrences} />
          )}
        </SectionCard>

        <SectionCard
          title={<span>Least used (top 5) <InfoTooltipIcon text="Shows how often this item appears in puzzles. Lower percentages mean you're less likely to encounter it." /></span>}
          className="text-left"
        >
          <div className="mb-3 inline-flex rounded-lg border border-slate-300 bg-white p-1">
            <button
              type="button"
              onClick={() => setLeastUsedMode("categories")}
              className={`rounded-md px-3 py-1 text-sm ${leastUsedMode === "categories" ? "bg-slate-700 text-white" : "text-slate-700"}`}
            >
              Categories
            </button>
            <button
              type="button"
              onClick={() => setLeastUsedMode("pairs")}
              className={`rounded-md px-3 py-1 text-sm ${leastUsedMode === "pairs" ? "bg-slate-700 text-white" : "text-slate-700"}`}
            >
              Pairs
            </button>
          </div>
          {leastUsedMode === "categories" ? (
            <CategoryList items={derived.leastCommonCategories} showDistributionBar distributionTotal={derived.totalCategoryCount} maxBarWidthPercent={50} />
          ) : (
            <PairList items={derived.leastCommonPairs} showDistributionBar distributionTotal={derived.totalPairOccurrences} />
          )}
        </SectionCard>

        <SectionCard title="Category type breakdown" className="text-left">
          <p className="mb-2 text-sm text-slate-600">How often each category type appears.</p>
          <div className="grid gap-4 md:grid-cols-[240px_1fr] md:items-center">
            <div className="mx-auto">
              <div className="h-52 w-52">
                <DonutChart
                  ariaLabel={derived.categoryTypeBreakdown.map((item) => `${item.label}: ${item.percent.toFixed(1)}%`).join(", ")}
                  segments={derived.categoryTypeBreakdown.map((item) => ({
                    value: item.count,
                    color: CATEGORY_TYPE_COLORS[item.type] ?? CATEGORY_TYPE_COLORS.other,
                  }))}
                  size={208}
                />
              </div>
            </div>

            <ul className="m-0 grid list-none gap-2 p-0">
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
        </SectionCard>

        <SectionCard title="Combination frequency distribution" className="text-left">
          <p className="mb-2 text-sm text-slate-600">How often each unique category pair appears.</p>
          <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-center">
            <div className="mx-auto">
              <div className="h-48 w-48">
                <DonutChart
                  ariaLabel={derived.pairFrequencyDistribution
                    .filter((bucket) => bucket.comboCount > 0)
                    .map((bucket) => `${bucket.label}: ${bucket.comboPercent.toFixed(1)}%`)
                    .join(", ")}
                  segments={derived.pairFrequencyDistribution.map((bucket) => ({ value: bucket.comboCount, color: bucket.color }))}
                  size={192}
                />
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
        </SectionCard>
      </section>
    </>
  );
}
