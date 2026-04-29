import { describe, expect, it } from "vitest";
import {
  DEX_DIFFICULTIES,
  EVOLUTION_TRIGGERS,
  POKEMON_CATEGORIES,
  POKEMON_REGIONS,
  POKEMON_TYPES,
  SPECIAL_FORMS,
  TYPE_LINES,
} from "./types";

describe("shared/types", () => {
  it("defines core taxonomy constants", () => {
    expect(POKEMON_TYPES).toContain("Water");
    expect(POKEMON_REGIONS).toContain("Kanto");
    expect(TYPE_LINES).toEqual(["Monotype", "Dualtype"]);
    expect(EVOLUTION_TRIGGERS).toContain("Evolved by Trade");
    expect(SPECIAL_FORMS).toContain("Mega Evolution");
    expect(POKEMON_CATEGORIES).toContain("Legendary");
    expect(DEX_DIFFICULTIES).toContain("Impossible");
  });
});
