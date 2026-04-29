import { useEffect, useState } from "react";
import { TodayApp, type TodayPuzzle } from "./TodayApp";

export function TodayLoader() {
  const [puzzles, setPuzzles] = useState<TodayPuzzle[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/runtime/today-puzzle.json?t=${Date.now()}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load puzzle');
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
      .catch(err => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="app loading">
        <p>Failed to load today&apos;s puzzle: {error}</p>
      </div>
    );
  }

  if (!puzzles) {
    return (
      <div className="app loading">
        <p>Loading today&apos;s puzzle...</p>
      </div>
    );
  }

  return <TodayApp puzzles={puzzles} />;
}
