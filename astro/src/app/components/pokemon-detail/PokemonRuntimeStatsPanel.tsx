import { useEffect, useMemo, useState } from "react";
import { CategoryIcon } from "../puzzle-stats/CategoryIcon";
import { getCategoryBarColor, parseCategoryId } from "../puzzle-stats/categoryUtils";

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

function formatDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
    ? new Date(year, month - 1, day)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function daysAgoFrom(value: string): number | null {
  const [year, month, day] = value.split("-").map(Number);
  const date = Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
    ? new Date(year, month - 1, day)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const msInDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / msInDay));
}

interface PokemonRuntimeStatsPanelProps {
  statsKeyId: number;
  variant?: "summary" | "sections";
}

export function PokemonRuntimeStatsPanel({ statsKeyId, variant = "sections" }: PokemonRuntimeStatsPanelProps) {
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
    return stats.usableDates
      .slice(-5)
      .reverse()
      .map((date) => ({
        date,
        label: formatDate(date),
        daysAgo: daysAgoFrom(date),
      }));
  }, [stats]);

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
                    <CategoryIcon parsed={row.parsed} />
                    <span className="truncate">{row.parsed.label}</span>
                  </span>
                  <div className="h-2 overflow-hidden rounded-full">
                    <div className="h-full" style={{ width: `${Math.max(0, Math.min(100, row.widthPercent)).toFixed(1)}%`, backgroundColor: row.color }} />
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
          <a className="text-sm font-semibold text-blue-600" href="/pokemon-list/">View all</a>
        </div>
        {comboRows.length > 0 ? (
          <ul className="grid gap-3 text-left">
            {comboRows.map((row, index) => (
              <li key={`${row.left.raw}-${row.right.raw}-${index}`} className="grid items-center gap-2 text-sm md:grid-cols-[minmax(0,1fr)_64px]">
                <div className="min-w-0">
                  <span className="mb-1 flex items-center gap-2 font-semibold text-slate-800">
                    <CategoryIcon parsed={row.left} />
                    <span className="truncate">{row.left.label}</span>
                    <span className="text-slate-400">+</span>
                    <CategoryIcon parsed={row.right} />
                    <span className="truncate">{row.right.label}</span>
                  </span>
                  <div className="h-2 overflow-hidden rounded-full">
                    <div className="h-full" style={{ width: `${Math.max(0, Math.min(100, row.widthPercent)).toFixed(1)}%`, background: row.gradient }} />
                  </div>
                </div>
                <strong className="text-left">{formatPercent(row.percent)}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No combination stats available.</p>
        )}
      </article> : null}

      {variant === "sections" ? <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2>Appearances over time</h2>
          <span className="text-xs text-slate-500">Latest 5 appearances</span>
        </div>
        {appearanceTimeline.length > 0 ? (
          <ul className="relative m-0 list-none p-0 before:absolute before:bottom-0 before:left-[10px] before:top-0 before:w-px before:bg-slate-200">
            {appearanceTimeline.map((entry, index) => (
              <li key={`${entry.date}-${index}`} className="relative grid grid-cols-[20px_1fr] items-center gap-3 pb-4 last:pb-0">
                <div className="relative flex h-full items-center justify-center">
                  <span className="relative z-10 inline-block h-2.5 w-2.5 rounded-full bg-sky-500" />
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="m-0 text-sm font-semibold text-slate-900">{entry.label}</p>
                  <p className="m-0 mt-0.5 text-xs text-slate-500">{entry.daysAgo === null ? "Unknown recency" : `${entry.daysAgo} days ago`}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No appearance history available.</p>
        )}
      </article> : null}
    </>
  );
}
