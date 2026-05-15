import { useEffect, useMemo, useState } from "react";
import type { Constraint } from "../../../../lib/shared/filters";
import type { FeaturedPick } from "../../../../lib/puzzle-fetch-core";

interface TodayPuzzle {
  type: string;
  rowConstraints: Constraint[];
  colConstraints: Constraint[];
  featuredPick?: FeaturedPick;
}

interface FeaturedPickInsight {
  featured: FeaturedPick;
}

const DIFFICULTY_BADGE_CLASS: Record<string, string> = {
  Easy: "bg-emerald-600",
  Normal: "bg-sky-600",
  Hard: "bg-amber-600",
  Expert: "bg-orange-700",
  Nightmare: "bg-purple-700",
  Impossible: "bg-rose-700",
};

const DIFFICULTY_TONE_CLASS: Record<string, string> = {
  Easy: "text-emerald-700",
  Normal: "text-sky-700",
  Hard: "text-amber-700",
  Expert: "text-orange-700",
  Nightmare: "text-violet-700",
  Impossible: "text-slate-700",
};

const DIFFICULTY_ACCENT_CLASS: Record<string, string> = {
  Easy: "border-emerald-200/90 from-emerald-50 via-white to-lime-50",
  Normal: "border-sky-200/90 from-sky-50 via-white to-cyan-50",
  Hard: "border-amber-200/90 from-amber-50 via-white to-orange-50",
  Expert: "border-orange-200/90 from-orange-50 via-white to-rose-50",
  Nightmare: "border-violet-200/90 from-violet-50 via-white to-fuchsia-50",
  Impossible: "border-slate-300/90 from-slate-100 via-white to-zinc-100",
};

function rankPuzzleType(type: string): number {
  return type === "BONUS" ? 1 : 0;
}

function formatPokemonName(name: string): string {
  return name
    .split(" ")
    .map((word) => {
      if (!word) return word;
      if (word.toLowerCase() === "gmax") return "Gmax";
      return word[0].toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export function HomeFeaturedPick() {
  const [puzzle, setPuzzle] = useState<TodayPuzzle | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/runtime/today-puzzle.json?t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load puzzle");
        return res.json();
      })
      .then((data) => {
        const puzzleList = (Array.isArray(data) ? data : [data]) as TodayPuzzle[];
        const [firstPuzzle] = [...puzzleList].sort((a, b) => rankPuzzleType(a.type) - rankPuzzleType(b.type));
        if (firstPuzzle) setPuzzle(firstPuzzle);
      })
      .catch(() => undefined);

  }, []);

  const featuredPick = useMemo<FeaturedPickInsight | null>(() => {
    if (!puzzle?.featuredPick) return null;
    return { featured: puzzle.featuredPick };
  }, [puzzle]);

  if (!featuredPick) {
    return null;
  }

  const difficulty = featuredPick.featured.dexDifficulty;
  const difficultyPercentile = Math.max(1, Math.round(featuredPick.featured.dexDifficultyPercentile ?? 0));
  const topDifficultyPercent = Math.min(100, difficultyPercentile);
  const accentClass = difficulty ? DIFFICULTY_ACCENT_CLASS[difficulty] || "border-slate-200 from-slate-50 via-white to-slate-100" : "border-slate-200 from-slate-50 via-white to-slate-100";
  const toneClass = difficulty ? DIFFICULTY_TONE_CLASS[difficulty] || "text-slate-700" : "text-slate-700";

  return (
    <section className="mt-6">
      <p className="m-0 text-lg font-bold text-slate-900">Today's featured pick</p>
      <a
        href="/pokedoku-answers-today/"
        className={`group mt-1.5 block rounded-2xl border bg-gradient-to-br p-4 no-underline shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-[1px] hover:shadow-[0_14px_34px_rgba(15,23,42,0.12)] active:translate-y-0 ${accentClass}`}
      >
        <div className="flex items-center gap-3">
          {featuredPick.featured.sprite ? (
            <div className="relative flex h-[5.5rem] w-[5.5rem] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-br from-white via-violet-50/70 to-fuchsia-100/70 shadow-inner">
              <div className="pointer-events-none absolute inset-3 rounded-full bg-white/80 blur-[8px]"></div>
              <img
                src={featuredPick.featured.sprite}
                alt={formatPokemonName(featuredPick.featured.name)}
                className="relative h-[5.3rem] w-[5.3rem] object-contain"
                loading="lazy"
                decoding="async"
              />
            </div>
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-slate-300 bg-white text-xs font-semibold text-slate-500">
              No img
            </div>
          )}

          <div className="min-w-0">
            <p className="m-0 text-xl font-extrabold leading-tight text-slate-900">{formatPokemonName(featuredPick.featured.name)}</p>
            <div className={`mt-1 flex flex-wrap items-center gap-1.5 text-sm font-semibold ${toneClass}`}>
              {difficulty && (
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold text-white ${DIFFICULTY_BADGE_CLASS[difficulty] || "bg-slate-500"}`}
                  title="Dex difficulty tier"
                >
                  {difficulty}
                </span>
              )}
              <span>Top {topDifficultyPercent}% difficulty</span>
            </div>
            <p className="mt-2 mb-0 max-w-[30ch] text-sm leading-5 text-slate-700">
              Today’s hardest valid answer. Fits only {featuredPick.featured.globalCategoryCombinationCount} category combinations.
            </p>
          </div>
        </div>
      </a>
    </section>
  );
}
