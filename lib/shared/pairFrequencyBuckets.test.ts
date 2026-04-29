import { describe, expect, it } from "vitest";
import { PAIR_FREQUENCY_BUCKETS } from "./pairFrequencyBuckets";

describe("shared/pairFrequencyBuckets", () => {
  it("defines non-overlapping sorted bucket ranges", () => {
    expect(PAIR_FREQUENCY_BUCKETS.length).toBeGreaterThan(0);

    for (let i = 0; i < PAIR_FREQUENCY_BUCKETS.length; i++) {
      const bucket = PAIR_FREQUENCY_BUCKETS[i];
      expect(bucket.min).toBeGreaterThan(0);
      if (bucket.max !== null) {
        expect(bucket.max).toBeGreaterThanOrEqual(bucket.min);
      }
      if (i > 0) {
        const prev = PAIR_FREQUENCY_BUCKETS[i - 1];
        if (prev.max !== null) {
          expect(bucket.min).toBeGreaterThan(prev.max);
        }
      }
    }
  });
});
