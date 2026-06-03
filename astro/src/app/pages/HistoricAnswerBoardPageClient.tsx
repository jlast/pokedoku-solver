import { useEffect, useMemo, useState } from "react";
import { formatDate } from "../../../../lib/shared/utils";
import { trackEvent } from "../../../../lib/browser/analytics";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { DateChip } from "../components/shared/DateChip";
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

function ArrowLink({ href, label, direction }: { href: string; label: string; direction: "left" | "right" }) {
  return (
    <a
      href={href}
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-h)] no-underline transition-colors hover:bg-[var(--accent-bg)]"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d={direction === "left" ? "m15 18-6-6 6-6" : "m9 6 6 6-6 6"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
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
    trackEvent("open_historic_answer", { slug: puzzle.slug, type: puzzle.type });
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
            <section className="mb-4 flex items-center justify-center gap-2">
              {olderPuzzle ? <ArrowLink href={getPuzzleArchiveHref(olderPuzzle)} label={`View older board from ${formatDate(olderPuzzle.date)}`} direction="left" /> : <div className="h-9 w-9" aria-hidden="true" />}
              <DateChip date={formattedDate} className="min-w-[220px] justify-center px-4 py-2 text-sm font-semibold" />
              {newerPuzzle ? <ArrowLink href={getPuzzleArchiveHref(newerPuzzle)} label={`View newer board from ${formatDate(newerPuzzle.date)}`} direction="right" /> : <div className="h-9 w-9" aria-hidden="true" />}
            </section>

            <div className="mb-4 flex justify-center">
              <a href="/tools/historic-answers/" className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-sm font-semibold text-[var(--text-h)] no-underline transition-colors hover:bg-[var(--accent-bg)]">
                Back to archive
              </a>
            </div>

            <TodayBoard puzzle={puzzle} showRecommendations={false} />
          </>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}
