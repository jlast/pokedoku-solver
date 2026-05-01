import { useEffect, useMemo, useState } from "react";
import { getCategoryBarColor, parseCategoryId } from "../puzzle-stats/categoryUtils";
import { CombinationRows } from "../shared/CombinationRows";
import { HistoryTimelineCard } from "../shared/HistoryTimelineCard";
import { FILTER_CATEGORIES } from "../../../../../lib/shared/filters";
import { slugify } from "../../../lib/slug";
import { CategoryBadgeLink } from "../shared/CategoryBadgeLink";

interface RuntimeCategoryMatch {
  categoryId: string;
  occurrences: number;
}

interface RuntimeCombinationMatch {
  categories: string[];
  occurrences: number;
}

interface PokemonRuntimeStats {
  puzzlesAnalyzed: number;
  totalAppearances: {
    count: number;
    percentage: number;
  };
  lastUsable: {
    date: string;
    daysAgo: number;
  };
  usableDates: string[];
  categoryMatches: RuntimeCategoryMatch[];
  combinationMatches: RuntimeCombinationMatch[];
}

interface PokemonRuntimeStatsPanelProps {
  statsKeyId: number;
}

function PokemonRuntimeStatsPanelContent({ statsKeyId, variant }: PokemonRuntimeStatsPanelProps & { variant: "summary" | "sections" }) {
  const [stats, setStats] = useState<PokemonRuntimeStats | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/data/runtime/pokemon/${statsKeyId}-stats.json?t=${Date.now()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (!active || !data || typeof data !== "object") return;
        const parsed = data as Partial<PokemonRuntimeStats>;
        if (
          typeof parsed.puzzlesAnalyzed === "number" &&
          Array.isArray(parsed.categoryMatches) &&
          Array.isArray(parsed.combinationMatches) &&
          Array.isArray(parsed.usableDates) &&
          typeof parsed.totalAppearances?.percentage === "number" &&
          typeof parsed.lastUsable?.daysAgo === "number"
        ) {
          setStats(parsed as PokemonRuntimeStats);
        }
      })
      .catch(() => {
        setStats(null);
      });

    return () => {
      active = false;
    };
  }, [statsKeyId]);

  const categoryRows = useMemo(() => {
    if (!stats) return [];
    const rows = stats.categoryMatches.map((match) => {
      const parsed = parseCategoryId(match.categoryId);
      const percent = stats.puzzlesAnalyzed > 0 ? (match.occurrences / stats.puzzlesAnalyzed) * 100 : 0;
      return { parsed, percent, color: getCategoryBarColor(parsed) };
    });
    const maxPercent = rows.reduce((max, row) => Math.max(max, row.percent), 0);
    return rows.map((row) => ({
      ...row,
      widthPercent: maxPercent > 0 ? (row.percent / maxPercent) * 100 : 0,
    }));
  }, [stats]);

  const comboRows = useMemo(() => {
    if (!stats) return [];
    const rows = stats.combinationMatches.map((match) => {
      const left = parseCategoryId(match.categories[0] ?? "");
      const right = parseCategoryId(match.categories[1] ?? "");
      const percent = stats.puzzlesAnalyzed > 0 ? (match.occurrences / stats.puzzlesAnalyzed) * 100 : 0;
      const leftColor = getCategoryBarColor(left);
      const rightColor = getCategoryBarColor(right);
      return { left, right, percent, gradient: `linear-gradient(90deg, ${leftColor}, ${rightColor})` };
    });
    const maxPercent = rows.reduce((max, row) => Math.max(max, row.percent), 0);
    return rows.map((row) => ({
      ...row,
      widthPercent: maxPercent > 0 ? (row.percent / maxPercent) * 100 : 0,
    }));
  }, [stats]);

  function formatPercent(value: number): string {
    return value > 10 ? `${Math.round(value)}%` : `${value.toFixed(1)}%`;
  }

  const appearanceTimeline = useMemo(() => {
    if (!stats?.usableDates?.length) return [];
    return stats.usableDates.slice(-5).reverse();
  }, [stats]);

  const categorySlugSet = useMemo(
    () =>
      new Set(
        FILTER_CATEGORIES.flatMap((filterCategory) =>
          filterCategory.options.map((option) => slugify(option.name)),
        ),
      ),
    [],
  );

  function getCategoryHref(label: string): string | null {
    const slug = slugify(label);
    return categorySlugSet.has(slug) ? `/category/${slug}/` : null;
  }

  return (
    <>
      {variant === "summary" ? (
        <>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <span className="block text-sm text-slate-500">Last valid</span>
            <strong className="text-slate-900">{stats ? `${stats.lastUsable.daysAgo} days ago` : "Unknown"}</strong>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <span className="block text-sm text-slate-500">Total appearances</span>
            <strong className="text-slate-900">{stats ? `${stats.totalAppearances.percentage.toFixed(2)}% of puzzles` : "Unknown"}</strong>
          </article>
        </>
      ) : null}

      {variant === "sections" ? <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2>Most common categories</h2>
        </div>
        {categoryRows.length > 0 ? (
          <ul className="grid gap-3 text-left">
            {categoryRows.map((row) => (
              <li key={row.parsed.raw} className="grid items-center gap-2 text-sm md:grid-cols-[minmax(0,1fr)_64px]">
                <div className="min-w-0">
                  <span className="mb-1 flex items-center gap-2 font-semibold text-slate-800">
                    <CategoryBadgeLink parsed={row.parsed} href={getCategoryHref(row.parsed.label)} />
                  </span>
                  <div className="h-2 overflow-hidden rounded-full">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, row.widthPercent)).toFixed(1)}%`, backgroundColor: row.color }} />
                  </div>
                </div>
                <strong className="text-left">{formatPercent(row.percent)}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No category stats available.</p>
        )}
      </article> : null}

      {variant === "sections" ? <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2>Top combinations</h2>
        </div>
        {comboRows.length > 0 ? (
          <CombinationRows
            rows={comboRows.map((row) => ({
              leftRaw: row.left.raw,
              rightRaw: row.right.raw,
              percent: row.percent,
              widthPercent: row.widthPercent,
              gradient: row.gradient,
            }))}
          />
        ) : (
          <p className="text-sm text-slate-500">No combination stats available.</p>
        )}
      </article> : null}

      {variant === "sections" ? (
        <HistoryTimelineCard
          dates={appearanceTimeline}
          title="Appearances over time"
          subtitle="Latest 5 appearances"
          emptyText="No appearance history available."
        />
      ) : null}
    </>
  );
}

export function PokemonRuntimeStatsSummaryPanel({ statsKeyId }: PokemonRuntimeStatsPanelProps) {
  return <PokemonRuntimeStatsPanelContent statsKeyId={statsKeyId} variant="summary" />;
}

export function PokemonRuntimeStatsSectionsPanel({ statsKeyId }: PokemonRuntimeStatsPanelProps) {
  return <PokemonRuntimeStatsPanelContent statsKeyId={statsKeyId} variant="sections" />;
}
