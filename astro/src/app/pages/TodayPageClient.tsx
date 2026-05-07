import { useEffect, useMemo, useState } from "react";
import { formatDate } from "../../../../lib/shared/utils";
import { trackEvent } from "../../../../lib/browser/analytics";
import { TodayBoard, type TodayPuzzle } from "./TodayBoard";

export function TodayPageClient() {
  const [puzzles, setPuzzles] = useState<TodayPuzzle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"today" | "bonus">("today");

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/runtime/today-puzzle.json?t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load puzzle");
        return res.json();
      })
      .then((data) => {
        const puzzleList = Array.isArray(data) ? data : [data];
        const ordered = [...puzzleList].sort((a, b) => {
          if (a.type === "BONUS" && b.type !== "BONUS") return 1;
          if (a.type !== "BONUS" && b.type === "BONUS") return -1;
          return 0;
        });
        setPuzzles(ordered);
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

  useEffect(() => {
    if (!puzzles || !regularPuzzle) return;
    const effectiveTab = activeTab === "bonus" && bonusPuzzle ? "bonus" : "today";
    const activePuzzle = effectiveTab === "bonus" ? bonusPuzzle! : regularPuzzle;
    const formattedDate = formatDate(activePuzzle.date);
    const title = `Today's Answers (${formattedDate})`;
    document.querySelectorAll<HTMLElement>("[data-header-title]").forEach((el) => {
      el.textContent = title;
    });
    document.querySelectorAll<HTMLElement>("[data-header-date]").forEach((el) => {
      el.textContent = formattedDate;
    });
  }, [activeTab, bonusPuzzle, puzzles, regularPuzzle]);

  if (error) {
    return (
      <div className="app loading text-center">
        <p>Failed to load today&apos;s puzzle: {error}</p>
      </div>
    );
  }

  if (!puzzles || !regularPuzzle) {
    return (
      <div className="app loading text-center">
        <p>Loading today&apos;s puzzle...</p>
      </div>
    );
  }

  const effectiveTab = activeTab === "bonus" && bonusPuzzle ? "bonus" : "today";
  const activePuzzle = effectiveTab === "bonus" ? bonusPuzzle! : regularPuzzle;

  return (
    <>
      {bonusPuzzle && (
        <div className="today-puzzle-toggle" role="tablist" aria-label="Choose puzzle">
          <button
            type="button"
            role="tab"
            aria-selected={effectiveTab === "today"}
            className={`today-puzzle-tab ${effectiveTab === "today" ? "active" : ""}`}
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
            className={`today-puzzle-tab ${effectiveTab === "bonus" ? "active" : ""}`}
            onClick={() => {
              trackEvent("click_today_toggle", { tab: "bonus" });
              setActiveTab("bonus");
            }}
          >
            <span className="today-puzzle-tab-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
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
