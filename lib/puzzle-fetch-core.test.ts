import { describe, expect, it, vi } from "vitest";
import { fetchPuzzles } from "./puzzle-fetch-core";

const RAW_PUZZLE = {
  type: "AUTOMATIC",
  date: "2025-01-01",
  size: 9,
  x1: { type: "POKEMON_TYPE", obj: "water" },
  x2: { type: "MONOTYPE", obj: true },
  x3: { type: "GENERATION", obj: "generation-i" },
  y1: { type: "EVOLUTION_POSITION", obj: "final" },
  y2: { type: "LEGENDARY", obj: true },
  y3: { type: "EVOLVED_BY", obj: "trade" },
};

describe("puzzle-fetch-core", () => {
  it("maps puzzle constraints from API response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => RAW_PUZZLE,
      }),
    );

    const puzzles = await fetchPuzzles();
    expect(puzzles).toHaveLength(1);
    expect(puzzles[0].size).toBe(9);
    expect(puzzles[0].colConstraints[0]).toEqual({ category: "types", value: "Water" });
    expect(puzzles[0].colConstraints[1]).toEqual({ category: "types", value: "Monotype" });
    expect(puzzles[0].colConstraints[2]).toEqual({ category: "regions", value: "Kanto" });
    expect(puzzles[0].rowConstraints[0]).toEqual({ category: "evolution", value: "Final Stage" });
  });

  it("throws when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: "Error" }),
    );

    await expect(fetchPuzzles()).rejects.toThrow("Failed to fetch puzzle: 500 Error");
  });
});
