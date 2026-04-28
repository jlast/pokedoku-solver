export interface PairFrequencyBucket {
  key: string;
  label: string;
  min: number;
  max: number | null;
  color: string;
}

export const PAIR_FREQUENCY_BUCKETS: PairFrequencyBucket[] = [
  { key: "once", label: "1 time", min: 1, max: 1, color: "#7c3aed" },
  { key: "twoToNine", label: "2-9 times", min: 2, max: 9, color: "#2563eb" },
  { key: "fiveToNineteen", label: "10-19 times", min: 10, max: 19, color: "#eab308" },
  { key: "twenty+", label: "20+ times", min: 20, max: null, color: "#f97316" },
];
