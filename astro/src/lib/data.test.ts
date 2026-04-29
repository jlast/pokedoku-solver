import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";

const POKEMON_FIXTURE = [
  {
    id: 7,
    name: "Squirtle",
    types: ["Water"],
    region: "Kanto",
    evolutionStage: "First Stage",
    category: "Starter",
    formId: 7,
  },
  {
    id: 6,
    name: "Charizard",
    types: ["Fire", "Flying"],
    region: "Kanto",
    evolutionStage: "Final Stage",
    formId: 6,
  },
  {
    id: 130,
    name: "Gyarados",
    types: ["Water", "Flying"],
    region: "Kanto",
    evolutionStage: "Final Stage",
    formId: 130,
  },
];

describe("astro/lib/data", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(fs, "readFileSync").mockReturnValue(JSON.stringify(POKEMON_FIXTURE));
  });

  it("loads and slugs pokemon records", async () => {
    const mod = await import("./data");
    const list = mod.getPokemonList();
    expect(list).toHaveLength(3);
    expect(mod.getPokemonSlug(list[0])).toBe("squirtle-7");
    expect(mod.getPokemonBySlugMap().get("charizard-6")?.name).toBe("Charizard");
  });

  it("builds category and pair lookups", async () => {
    const mod = await import("./data");
    const categories = mod.getCategories();
    expect(categories.some((c) => c.slug === "water")).toBe(true);
    expect(mod.getCategoryBySlugMap().get("kanto")?.label).toBe("Kanto");

    const pairs = mod.getCategoryPairs();
    expect(pairs.length).toBeGreaterThan(0);
    const canonical = mod.canonicalizePairSlugs("water", "kanto");
    expect(canonical).toBeTruthy();
    expect(mod.getCategoryPairBySlugs("kanto", "water")).not.toBeNull();
  });
});
