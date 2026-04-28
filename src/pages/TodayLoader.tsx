import { useEffect, useState } from "react";
import { TodayApp, type TodayPuzzle } from "./TodayApp";

export function TodayLoader() {
  const [puzzle, setPuzzle] = useState<TodayPuzzle | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}today-puzzle.json?t=${Date.now()}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load puzzle');
        return res.json();
      })
      .then(data => setPuzzle(data))
      .catch(err => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="app loading">
        <p>Failed to load today&apos;s puzzle: {error}</p>
      </div>
    );
  }

  if (!puzzle) {
    return (
      <div className="app loading">
        <p>Loading today&apos;s puzzle...</p>
      </div>
    );
  }

  return <TodayApp puzzle={puzzle} />;
}
