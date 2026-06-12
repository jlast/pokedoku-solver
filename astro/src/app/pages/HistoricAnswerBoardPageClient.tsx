import { useEffect, useMemo, useState } from "react";
import { formatDate } from "../../../../lib/shared/utils";
import { trackEvent } from "../../../../lib/browser/analytics";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { PuzzleDateSwitcher } from "../components/shared/PuzzleDateSwitcher";
import { TodayBoard } from "./TodayBoard";
import type { ArchivePuzzle } from "../../lib/puzzleArchive";
import { getPuzzleArchiveHref, isBonusPuzzle } from "../../lib/puzzleArchive";

function getRequestedBoard(): { date: string | null; bonus: boolean } {
  if (typeof window === "undefined") {
    return { date: null, bonus: false };
  }

  const params = new URLSearchParams(window.location.search);
  const date = params.get("date");
  const bonus = params.get("bonus") === "1";
  return { date, bonus };
}

function matchesRequestedBoard(puzzle: ArchivePuzzle, date: string, bonus: boolean): boolean {
  return puzzle.date === date && isBonusPuzzle(puzzle) === bonus;
}

export function HistoricAnswerBoardPageClient() {
  const [{ date, bonus }, setRequestedBoard] = useState(getRequestedBoard);
  const [items, setItems] = useState<ArchivePuzzle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const syncFromLocation = () => {
      setRequestedBoard(getRequestedBoard());
    };

    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    return () => {
      window.removeEventListener("popstate", syncFromLocation);
    };
  }, []);

  useEffect(() => {
    let active = true;

    fetch(`${import.meta.env.BASE_URL}data/runtime/puzzle-archive-index.json?t=${Date.now()}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load historic board data");
        }

        const data = (await response.json()) as { items?: ArchivePuzzle[] };
        if (!active) return;
        setItems(Array.isArray(data.items) ? data.items : []);
        setError(null);
      })
      .catch((fetchError: unknown) => {
        if (!active) return;
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load historic board data");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const currentIndex = useMemo(() => {
    if (!date) return -1;
    return items.findIndex((item) => matchesRequestedBoard(item, date, bonus));
  }, [bonus, date, items]);

  const puzzle = currentIndex >= 0 ? items[currentIndex] : null;
  const newerPuzzle = currentIndex > 0 ? items[currentIndex - 1] : null;
  const olderPuzzle = currentIndex >= 0 && currentIndex < items.length - 1 ? items[currentIndex + 1] : null;
  const formattedDate = puzzle ? formatDate(puzzle.date) : null;

  useEffect(() => {
    if (!puzzle) return;
    trackEvent('content_open', {
      page_name: 'historic_answers',
      location: 'historic_answers',
      target: 'historic_answer',
      value: puzzle.slug,
    });
  }, [puzzle]);

  return (
    <div className="min-h-screen p-5">
      <Header
        title={puzzle ? (isBonusPuzzle(puzzle) ? "Historic Bonus Answers" : "Historic Pokedoku Answers") : "Historic Pokedoku Answers"}
        subtitle={puzzle && formattedDate ? `Revisit the ${isBonusPuzzle(puzzle) ? "bonus" : "daily"} board from ${formattedDate} and inspect every square.` : "Open any archived board by date."}
        alwaysShowSubheader={true}
        currentPage="tools"
      />

      <main className="mx-auto w-full max-w-6xl px-4 pb-10">
        {!date ? (
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
            <h2 className="m-0 text-xl font-semibold text-[var(--text-h)]">Choose a historic board</h2>
            <p className="mt-2 mb-0 text-sm text-[var(--text)]">Open a board from the archive page to load it here.</p>
          </section>
        ) : null}

        {isLoading ? (
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
            <p className="m-0 text-sm text-[var(--text)]">Loading historic board...</p>
          </section>
        ) : null}

        {error ? (
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
            <p className="m-0 text-sm text-red-600">{error}</p>
          </section>
        ) : null}

        {!isLoading && !error && date && !puzzle ? (
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
            <h2 className="m-0 text-xl font-semibold text-[var(--text-h)]">Board not found</h2>
            <p className="mt-2 mb-0 text-sm text-[var(--text)]">No historic board matched that date.</p>
          </section>
        ) : null}

        {puzzle && formattedDate ? (
          <>
            <PuzzleDateSwitcher
              date={formattedDate}
              previousHref={olderPuzzle ? getPuzzleArchiveHref(olderPuzzle) : null}
              previousLabel={olderPuzzle ? `View older board from ${formatDate(olderPuzzle.date)}` : undefined}
              nextHref={newerPuzzle ? getPuzzleArchiveHref(newerPuzzle) : null}
              nextLabel={newerPuzzle ? `View newer board from ${formatDate(newerPuzzle.date)}` : undefined}
              actions={[{ href: "/tools/historic-answers/", label: "Back to archive" }]}
            />

            <TodayBoard puzzle={puzzle} showRecommendations={false} />
          </>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
