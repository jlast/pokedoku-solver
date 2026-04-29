import { describe, expect, it } from "vitest";
import { makePairSlug, parsePairSlug, slugify } from "./slug";

describe("astro/lib/slug", () => {
  it("slugifies labels", () => {
    expect(slugify("  Mega Evolution  ")).toBe("mega-evolution");
    expect(slugify("Pokémon Élite")).toBe("pokemon-elite");
  });

  it("builds and parses pair slugs", () => {
    const slug = makePairSlug("water", "fire");
    expect(slug).toBe("water-x-fire");
    expect(parsePairSlug(slug)).toEqual({ left: "water", right: "fire" });
    expect(parsePairSlug("water-fire")).toBeNull();
  });
});
