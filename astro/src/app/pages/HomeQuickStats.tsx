import { useEffect, useState } from "react";

interface PuzzleStatsResponse {
  puzzlesAnalyzed: number;
}

export function HomeQuickStats() {
  const [puzzlesAnalyzed, setPuzzlesAnalyzed] = useState<number | null>(null);
  const roundedPuzzlesAnalyzed =
    puzzlesAnalyzed !== null ? Math.floor(puzzlesAnalyzed / 100) * 100 : null;

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/runtime/puzzle-stats.json?t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load puzzle stats");
        return res.json();
      })
      .then((data: PuzzleStatsResponse) => {
        if (typeof data.puzzlesAnalyzed === "number") {
          setPuzzlesAnalyzed(data.puzzlesAnalyzed);
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3 text-slate-700">
      <div>
        <p className="m-0 inline-flex items-center gap-2 text-3xl font-bold text-slate-900">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="text-indigo-600">
            <path d="M3 17h3V9H3v8zm5 0h3V5H8v12zm5 0h3v-4h-3v4zm5 2H2v2h16v-2z" />
          </svg>
          {roundedPuzzlesAnalyzed !== null ? `${roundedPuzzlesAnalyzed.toLocaleString()}+` : "..."}
        </p>
        <p className="m-0 text-sm">Puzzles analyzed</p>
      </div>
      <div className="hidden h-10 w-px bg-slate-200 sm:block"></div>
      <div>
        <p className="m-0 inline-flex items-center gap-2 text-3xl font-bold text-slate-900">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="text-emerald-600">
            <path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 15H5V10h14v9z" />
          </svg>
          Updated Daily
        </p>
        <p className="m-0 text-sm">New puzzle every day</p>
      </div>
    </div>
  );
}
