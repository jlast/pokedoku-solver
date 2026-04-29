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
  categoryMatches: RuntimeCategoryMatch[];
  combinationMatches: RuntimeCombinationMatch[];
}

export function PokemonRuntimeStatsPanel({ statsKeyId, variant = "sections" }: { statsKeyId: number; variant?: "summary" | "sections" }) {
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
    return stats.categoryMatches.map((match) => {
      const parsed = parseCategoryId(match.categoryId);
      const percent = stats.puzzlesAnalyzed > 0 ? Math.round((match.occurrences / stats.puzzlesAnalyzed) * 100) : 0;
      return { parsed, percent, color: getCategoryBarColor(parsed) };
    });
  }, [stats]);

  const comboRows = useMemo(() => {
    if (!stats) return [];
    return stats.combinationMatches.map((match) => {
      const left = parseCategoryId(match.categories[0] ?? "");
      const right = parseCategoryId(match.categories[1] ?? "");
      const percent = stats.puzzlesAnalyzed > 0 ? Math.round((match.occurrences / stats.puzzlesAnalyzed) * 100) : 0;
      const leftColor = getCategoryBarColor(left);
      const rightColor = getCategoryBarColor(right);
      return { left, right, percent, gradient: `linear-gradient(90deg, ${leftColor}, ${rightColor})` };
    });
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
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full" style={{ width: `${Math.max(0, Math.min(100, row.percent))}%`, backgroundColor: row.color }} />
                  </div>
                </div>
                <strong className="text-left">{row.percent}%</strong>
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
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full" style={{ width: `${Math.max(0, Math.min(100, row.percent))}%`, background: row.gradient }} />
                  </div>
                </div>
                <strong className="text-left">{row.percent}%</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No combination stats available.</p>
        )}
      </article> : null}
    </>
  );
}
