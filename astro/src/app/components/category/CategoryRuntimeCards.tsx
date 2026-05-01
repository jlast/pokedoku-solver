import { useEffect, useMemo, useState } from "react";
import { parseCategoryId, getCategoryBarColor } from "../puzzle-stats/categoryUtils";
import { CombinationRows } from "../shared/CombinationRows";

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

  const timeline = useMemo(() => {
    if (!stats) return [];
    return stats.appearanceDates.slice(0, 5).map((date) => ({
      date,
      label: formatDate(date),
      daysAgo: daysAgoFrom(date),
    }));
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

      <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
        <div className="flex gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Historic appearances</h2>
        </div>
        <div className="mb-3 flex text-xs text-slate-500">Latest 5 appearances</div>
        {timeline.length > 0 ? (
          <ul className="relative m-0 list-none p-0 before:absolute before:bottom-0 before:left-[10px] before:top-0 before:w-px before:bg-slate-200">
            {timeline.map((entry, index) => (
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
      </article>
    </section>
  );
}
