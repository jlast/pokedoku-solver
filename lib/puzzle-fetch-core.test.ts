import { describe, expect, it, vi } from "vitest";
import type { Pokemon } from "@pokedoku-helper/shared-types";
import { createTodayPuzzleFile, enrichPuzzlesWithFeaturedPick, fetchPuzzles, parseTodayPuzzleFile } from "./puzzle-fetch-core";

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

  it("excludes move and ability groups from featured pick combination counts", () => {
    const alpha: Pokemon = {
      id: 1,
      name: "Alpha",
      types: ["Fire"],
      region: ["Kanto"],
      evolutionStage: "Final Stage",
      categories: ["Legendary"],
      learnedMoves: ["Surf"],
      abilities: ["Swift Swim"],
      dexDifficulty: "Nightmare",
      dexDifficultyPercentile: 99,
    };
    const beta: Pokemon = {
      id: 2,
      name: "Beta",
      types: ["Water"],
      region: ["Kanto"],
      evolutionStage: "Final Stage",
      categories: ["Legendary"],
      learnedMoves: ["Surf"],
      abilities: ["Swift Swim"],
      dexDifficulty: "Easy",
      dexDifficultyPercentile: 1,
    };
    const gamma: Pokemon = {
      id: 3,
      name: "Gamma",
      types: ["Grass"],
      region: ["Kanto"],
      evolutionStage: "Final Stage",
      categories: ["Legendary"],
      learnedMoves: ["Surf"],
      abilities: ["Swift Swim"],
      dexDifficulty: "Easy",
      dexDifficultyPercentile: 1,
    };

    const puzzles = enrichPuzzlesWithFeaturedPick([
      {
        date: "2025-01-01",
        type: "AUTOMATIC",
        bonus: false,
        size: 1,
        rowConstraints: [{ category: "category", value: "Legendary" }],
        colConstraints: [{ category: "regions", value: "Kanto" }],
      },
    ], [alpha, beta, gamma]);

    expect(puzzles[0].featuredPick?.name).toBe("Alpha");
    expect(puzzles[0].featuredPick?.globalCategoryCombinationCount).toBe(6);
  });

  it("parses the expanded today puzzle payload", () => {
    const payload = createTodayPuzzleFile(
      [
        {
          date: "2025-01-01",
          type: "AUTOMATIC",
          bonus: false,
          size: 9,
          rowConstraints: [{ category: "category", value: "Legendary" }],
          colConstraints: [{ category: "regions", value: "Kanto" }],
        },
      ],
      {
        date: "2024-12-31",
        type: "AUTOMATIC",
        bonus: false,
        size: 9,
        rowConstraints: [{ category: "category", value: "Legendary" }],
        colConstraints: [{ category: "regions", value: "Johto" }],
      },
    );

    const parsed = parseTodayPuzzleFile(payload);

    expect(parsed.puzzles).toHaveLength(1);
    expect(parsed.yesterdayPuzzle?.date).toBe("2024-12-31");
  });

  it("keeps supporting legacy today puzzle arrays", () => {
    const parsed = parseTodayPuzzleFile([
      {
        date: "2025-01-01",
        type: "AUTOMATIC",
        bonus: false,
        size: 9,
        rowConstraints: [{ category: "category", value: "Legendary" }],
        colConstraints: [{ category: "regions", value: "Kanto" }],
      },
    ]);

    expect(parsed.puzzles).toHaveLength(1);
    expect(parsed.yesterdayPuzzle).toBeNull();
  });
});
