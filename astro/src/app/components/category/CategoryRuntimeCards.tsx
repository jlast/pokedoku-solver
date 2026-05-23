import { useEffect, useMemo, useState } from "react";
import { parseCategoryId, getCategoryBarColor } from "../puzzle-stats/categoryUtils";
import { CombinationRows } from "../shared/CombinationRows";
import { HistoryTimelineCard } from "../shared/HistoryTimelineCard";
import { InfoTooltipIcon } from "../shared/InfoTooltipIcon";
import { SectionCard } from "../shared/SectionCard";

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
  showCombinations?: boolean;
  showHistory?: boolean;
}


export function CategoryRuntimeCards({ statsFileName, showCombinations = true, showHistory = true }: Props) {
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

  if (!showCombinations && !showHistory) return null;

  return (
    <section className="grid gap-4">
      {showCombinations ? (
        <SectionCard
          title={<span className="flex items-center gap-2">Most common combinations <InfoTooltipIcon text="Shows how often this combination appears in puzzles. Higher percentages mean you're more likely to encounter this pairing." /></span>}
        >
          {rows.length > 0 ? (
            <div className="mt-3">
              <CombinationRows rows={rows} />
            </div>
          ) : (
            <p className="mt-2 text-[var(--text)]">No combination history available yet.</p>
          )}
        </SectionCard>
      ) : null}

      {showHistory ? <HistoryTimelineCard dates={stats?.appearanceDates ?? []} /> : null}
    </section>
  );
}
