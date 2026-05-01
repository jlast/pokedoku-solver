import { useEffect, useState } from "react";
import { HistoryTimelineCard } from "../shared/HistoryTimelineCard";

interface PairRuntimeStats {
  lastAppeared?: {
    date: string | null;
  };
  appearanceDates?: string[];
}

interface Props {
  pairSlug: string;
}

export default function CategoryPairHistoryTimelineCard({ pairSlug }: Props) {
  const [dates, setDates] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    fetch(`/data/runtime/category-pairs/${pairSlug}-stats.json?t=${Date.now()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: PairRuntimeStats | null) => {
        if (!active || !data) return;
        const appearanceDates = Array.isArray(data.appearanceDates)
          ? [...data.appearanceDates].sort((a, b) => b.localeCompare(a)).slice(0, 5)
          : [];
        if (appearanceDates.length > 0) {
          setDates(appearanceDates);
          return;
        }
        if (data.lastAppeared?.date) {
          setDates([data.lastAppeared.date]);
          return;
        }
        setDates([]);
      })
      .catch(() => setDates([]));

    return () => {
      active = false;
    };
  }, [pairSlug]);

  return <HistoryTimelineCard dates={dates} />;
}
