import { describe, expect, it } from "vitest";
import {
  applyFilters,
  findConstraintOption,
  getActiveFilters,
  getFiltersForUrl,
  matchesConstraint,
  parseFiltersFromUrl,
  type FilterState,
} from "./filters";
import type { Pokemon } from "./types";

const SQUIRTLE: Pokemon = {
  id: 7,
  name: "Squirtle",
  types: ["Water"],
  region: "Kanto",
  evolutionStage: "First Stage",
};

const GYARADOS: Pokemon = {
  id: 130,
  name: "Gyarados",
  types: ["Water", "Flying"],
  region: "Kanto",
  evolutionStage: "Final Stage",
};

describe("shared/filters", () => {
  it("resolves known constraint options", () => {
    expect(findConstraintOption("Water")).toEqual({ value: "Water", category: "type" });
    expect(findConstraintOption("Nope")).toBeNull();
  });

  it("matches constraints by value", () => {
    expect(matchesConstraint(SQUIRTLE, { category: "types", value: "Water" })).toBe(true);
    expect(matchesConstraint(SQUIRTLE, { category: "types", value: "Fire" })).toBe(false);
    expect(matchesConstraint(SQUIRTLE, null)).toBe(true);
  });

  it("parses and serializes URL filters", () => {
    const params = new URLSearchParams("types=Water,Nope&regions=Kanto");
    const parsed = parseFiltersFromUrl(params);
    expect(parsed.types).toEqual(["Water"]);
    expect(parsed.regions).toEqual(["Kanto"]);

    const roundTrip = getFiltersForUrl(parsed).toString();
    expect(roundTrip).toContain("types=Water");
    expect(roundTrip).toContain("regions=Kanto");
  });

  it("applies AND logic per category", () => {
    const filters: FilterState = {
      types: ["Water", "Dualtype"],
      regions: ["Kanto"],
      evolution: [],
      category: [],
    };
    expect(applyFilters([SQUIRTLE, GYARADOS], filters)).toEqual([GYARADOS]);
    expect(getActiveFilters(filters)).toBe(3);
  });
});
