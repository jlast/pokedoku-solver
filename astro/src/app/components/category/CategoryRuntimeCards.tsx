import { useEffect, useMemo, useState } from "react";
import { parseCategoryId, getCategoryBarColor } from "../puzzle-stats/categoryUtils";
import { CombinationRows } from "../shared/CombinationRows";
import { HistoryTimelineCard } from "../shared/HistoryTimelineCard";

interface RuntimeCombinationMatch {
  categories: [string, string];
  occurrences: number;
}

interface CategoryRuntimeStats {
  puzzlesAnalyzed: number;
  lastAppeared: {
    date: string | null;
  };
  appearanceDates: string[];
  combinationMatches: RuntimeCombinationMatch[];
}

interface Props {
  statsFileName: string | null;
}


export function CategoryRuntimeCards({ statsFileName }: Props) {
  const [stats, setStats] = useState<CategoryRuntimeStats | null>(null);

  useEffect(() => {
    let active = true;
    if (!statsFileName) return;

    fetch(`/data/runtime/categories/${statsFileName}?t=${Date.now()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (!active || !data || typeof data !== "object") return;
        const parsed = data as Partial<CategoryRuntimeStats>;
        if (Array.isArray(parsed.combinationMatches) && Array.isArray(parsed.appearanceDates) && typeof parsed.puzzlesAnalyzed === "number") {
          setStats(parsed as CategoryRuntimeStats);
        }
      })
      .catch(() => setStats(null));

    return () => {
      active = false;
    };
  }, [statsFileName]);

  const rows = useMemo(() => {
    if (!stats) return [];
    const computed = stats.combinationMatches.map((match) => {
      const left = parseCategoryId(match.categories[0]);
      const right = parseCategoryId(match.categories[1]);
      const percent = stats.puzzlesAnalyzed > 0 ? (match.occurrences / stats.puzzlesAnalyzed) * 100 : 0;
      return {
        leftRaw: left.raw,
        rightRaw: right.raw,
        percent,
        widthPercent: percent,
        gradient: `linear-gradient(90deg, ${getCategoryBarColor(left)}, ${getCategoryBarColor(right)})`,
      };
    });
    const maxPercent = computed.reduce((max, row) => Math.max(max, row.percent), 0);
    return computed.map((row) => ({ ...row, widthPercent: maxPercent > 0 ? (row.percent / maxPercent) * 100 : 0 }));
  }, [stats]);

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
        <h2 className="text-xl text-left font-semibold tracking-tight text-slate-900">Most common combinations</h2>
        {rows.length > 0 ? (
          <div className="mt-3">
            <CombinationRows rows={rows} />
          </div>
        ) : (
          <p className="mt-2 text-slate-500">No combination history available yet.</p>
        )}
      </article>

      <HistoryTimelineCard dates={stats?.appearanceDates ?? []} />
    </section>
  );
}
