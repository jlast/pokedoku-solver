import { describe, expect, it } from "vitest";
import { buildCategoryStatsFiles, buildStats, summarizeFormIdQuality } from "./core";
import type { Puzzle } from "./types";

const puzzles: Puzzle[] = [
  {
    date: "2026-04-01",
    type: "AUTOMATIC",
    rowConstraints: [
      { category: "types", value: "Fire" },
      { category: "regions", value: "Kanto" },
    ],
    colConstraints: [
      { category: "category", value: "Starter" },
      { category: "evolution", value: "Final Stage" },
    ],
  },
  {
    date: "2026-04-02",
    type: "AUTOMATIC",
    rowConstraints: [{ category: "types", value: "Fire" }],
    colConstraints: [
      { category: "regions", value: "Johto" },
      { category: "category", value: "Legendary" },
    ],
  },
  {
    date: "2026-04-03",
    type: "AUTOMATIC",
    rowConstraints: [{ category: "types", value: "Water" }],
    colConstraints: [
      { category: "regions", value: "Kanto" },
      { category: "category", value: "Starter" },
    ],
  },
];

describe("buildCategoryStatsFiles", () => {
  it("builds appearance history and top 5 combinations for each category", () => {
    const result = buildCategoryStatsFiles(puzzles);
    const fireStats = result.files.find((file) => file.categoryId === "types:Fire");

    expect(fireStats).toBeDefined();
    expect(fireStats?.appearanceDates).toEqual(["2026-04-01", "2026-04-02"]);
    expect(fireStats?.totalAppearances.count).toBe(2);
    expect(fireStats?.totalAppearances.percentage).toBeCloseTo(66.67, 2);
    expect(fireStats?.lastAppeared.date).toBe("2026-04-02");
    expect(fireStats?.lastAppeared.daysAgo).toBe(1);
    expect(fireStats?.combinationMatches).toHaveLength(4);
    expect(fireStats?.combinationMatches.every((item) => item.occurrences === 1)).toBe(true);

    const comboKeys = new Set(
      fireStats?.combinationMatches.map((item) => item.categories.join("||")) ?? [],
    );
    expect(comboKeys).toEqual(
      new Set([
        "category:Starter||types:Fire",
        "evolution:Final Stage||types:Fire",
        "regions:Johto||types:Fire",
        "category:Legendary||types:Fire",
      ]),
    );
  });

  it("generates value-only output filenames", () => {
    const result = buildCategoryStatsFiles(puzzles);

    expect(result.fileNameByCategoryId.get("types:Fire")).toBe("fire-stats.json");
    expect(result.fileNameByCategoryId.get("regions:Kanto")).toBe("kanto-stats.json");
  });

  it("includes categories that never appeared in puzzle history", () => {
    const result = buildCategoryStatsFiles(puzzles);
    const bugStats = result.files.find((file) => file.categoryId === "types:Bug");

    expect(bugStats).toBeDefined();
    expect(bugStats?.totalAppearances.count).toBe(0);
    expect(bugStats?.appearanceDates).toEqual([]);
    expect(bugStats?.lastAppeared.date).toBeNull();
    expect(bugStats?.combinationMatches).toEqual([]);
  });
});

describe("buildStats", () => {
  it("populates oldestPokemonLastUsable when Pokemon match puzzle constraints", () => {
    const stats = buildStats(puzzles, [
      {
        id: 6,
        name: "Charizard",
        types: ["Fire", "Flying"],
        region: "Kanto",
        evolutionStage: "Final Stage",
        formId: 6,
      },
    ]);

    expect(stats.withoutLegacy.oldestPokemonLastUsable.length).toBeGreaterThan(0);
    expect(stats.withoutLegacy.oldestPokemonLastUsable[0]?.formId).toBe(6);
  });

  it("supports legacy singular constraint categories", () => {
    const legacyPuzzles: Puzzle[] = [
      {
        date: "2026-04-04",
        type: "AUTOMATIC",
        rowConstraints: [{ category: "type" as never, value: "Fire" }],
        colConstraints: [{ category: "evolution", value: "Final Stage" }],
      },
    ];

    const stats = buildStats(legacyPuzzles, [
      {
        id: 6,
        name: "Charizard",
        types: ["Fire", "Flying"],
        evolutionStage: "Final Stage",
        formId: 6,
      },
    ]);

    expect(stats.withoutLegacy.oldestPokemonLastUsable.length).toBe(1);
  });

  it("falls back to id when formId is missing", () => {
    const stats = buildStats(puzzles, [
      {
        id: 6,
        name: "Charizard",
        types: ["Fire", "Flying"],
        region: "Kanto",
        evolutionStage: "Final Stage",
      },
    ]);

    expect(stats.withoutLegacy.oldestPokemonLastUsable.length).toBe(1);
    expect(stats.withoutLegacy.oldestPokemonLastUsable[0]?.formId).toBe(6);
  });
});

describe("summarizeFormIdQuality", () => {
  it("reports missing formIds with sample ids", () => {
    const summary = summarizeFormIdQuality([
      { id: 1, name: "Bulbasaur", types: ["Grass", "Poison"], formId: 1 },
      { id: 4, name: "Charmander", types: ["Fire"] },
      { id: 7, name: "Squirtle", types: ["Water"] },
    ]);

    expect(summary.total).toBe(3);
    expect(summary.missingFormIdCount).toBe(2);
    expect(summary.missingFormIdSampleIds).toEqual([4, 7]);
  });
});
