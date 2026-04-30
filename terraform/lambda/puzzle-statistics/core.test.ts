import { describe, expect, it } from "vitest";
import { buildCategoryStatsFiles } from "./core";
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
});
