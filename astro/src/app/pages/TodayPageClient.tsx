import { useEffect, useMemo, useState } from "react";
import { parseTodayPuzzleFile } from "../../../../lib/puzzle-fetch-core";
import { formatDate } from "../../../../lib/shared/utils";
import { trackEvent } from "../../../../lib/browser/analytics";
import { getPuzzleArchiveHref } from "../../lib/puzzleArchive";
import { PuzzleDateSwitcher } from "../components/shared/PuzzleDateSwitcher";
import { TodayBoard, type TodayPuzzle } from "./TodayBoard";

export function TodayPageClient() {
  const [puzzles, setPuzzles] = useState<TodayPuzzle[] | null>(null);
  const [yesterdayPuzzle, setYesterdayPuzzle] = useState<TodayPuzzle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"today" | "bonus">("today");

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/runtime/today-puzzle.json?t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load puzzle");
        return res.json();
      })
      .then((data) => {
        const { puzzles: puzzleList, yesterdayPuzzle } = parseTodayPuzzleFile(data);
        const ordered = [...puzzleList].sort((a, b) => {
          if (a.type === "BONUS" && b.type !== "BONUS") return 1;
          if (a.type !== "BONUS" && b.type === "BONUS") return -1;
          return 0;
        });
        setPuzzles(ordered as TodayPuzzle[]);
        setYesterdayPuzzle((yesterdayPuzzle as TodayPuzzle | null) ?? null);
      })
      .catch((err) => setError(err.message));
  }, []);

  const regularPuzzle = useMemo(
    () => puzzles?.find((p) => p.type !== "BONUS" && p.bonus !== true) ?? puzzles?.[0],
    [puzzles],
  );
  const bonusPuzzle = useMemo(
    () => puzzles?.find((p) => p.type === "BONUS" || p.bonus === true),
    [puzzles],
  );

  if (error) {
    return (
      <div className="min-h-screen p-5 text-center">
        <p>Failed to load today&apos;s puzzle: {error}</p>
      </div>
    );
  }

  if (!puzzles || !regularPuzzle) {
    return (
      <div className="min-h-screen p-5 text-center">
        <p>Loading today&apos;s puzzle...</p>
      </div>
    );
  }

  const effectiveTab = activeTab === "bonus" && bonusPuzzle ? "bonus" : "today";
  const activePuzzle = effectiveTab === "bonus" ? bonusPuzzle! : regularPuzzle;

  return (
    <>
      <PuzzleDateSwitcher
        date={formatDate(regularPuzzle.date)}
        previousHref={yesterdayPuzzle ? getPuzzleArchiveHref(yesterdayPuzzle) : null}
        previousLabel={yesterdayPuzzle ? "Go to yesterday's puzzle" : undefined}
      />

      {bonusPuzzle && (
        <div className="my-3 flex justify-center gap-2" role="tablist" aria-label="Choose puzzle">
          <button
            type="button"
            role="tab"
            aria-selected={effectiveTab === "today"}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-2 text-[13px] font-semibold ${effectiveTab === "today" ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_14%,var(--bg))] text-[var(--text-h)]" : "border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)]"}`}
            onClick={() => {
              trackEvent("click_today_toggle", { tab: "today" });
              setActiveTab("today");
            }}
          >
            Today Puzzle
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={effectiveTab === "bonus"}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-2 text-[13px] font-semibold ${effectiveTab === "bonus" ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_14%,var(--bg))] text-[var(--text-h)]" : "border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)]"}`}
            onClick={() => {
              trackEvent("click_today_toggle", { tab: "bonus" });
              setActiveTab("bonus");
            }}
          >
            <span className="inline-flex h-3.5 w-3.5" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false" className="h-full w-full fill-current">
                <path d="M20 7h-2.18A2.99 2.99 0 0 0 18 6a3 3 0 0 0-5.5-1.66L12 5l-.5-.66A3 3 0 0 0 6 6c0 .35.06.69.18 1H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7h1a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1ZM9 5a1 1 0 0 1 .8.4L10.75 7H9A1 1 0 0 1 9 5Zm6 0a1 1 0 0 1 0 2h-1.75l.95-1.6A1 1 0 0 1 15 5ZM5 9h6v2H5V9Zm2 4h4v5H7v-5Zm6 5v-5h4v5h-4Zm6-7h-6V9h6v2Z" />
              </svg>
            </span>
            Bonus Puzzle
          </button>
        </div>
      )}

      <TodayBoard key={`${activePuzzle.date}-${activePuzzle.type}`} puzzle={activePuzzle} />
    </>
  );
}
