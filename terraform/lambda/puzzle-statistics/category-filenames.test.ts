import { describe, expect, it } from "vitest";
import { buildCategoryOutputFileNames, parseCategoryId, slugify } from "./category-filenames";

describe("category filename helpers", () => {
  it("parses category id into type and value", () => {
    expect(parseCategoryId("types:Fire")).toEqual({ type: "types", value: "Fire" });
    expect(parseCategoryId("NoSeparator")).toEqual({ type: "", value: "NoSeparator" });
  });

  it("slugifies category values", () => {
    expect(slugify("First Partner")).toBe("first-partner");
    expect(slugify("  Mr. Mime  ")).toBe("mr-mime");
    expect(slugify("***")).toBe("category");
  });

  it("builds collision-safe value-only filenames", () => {
    const names = buildCategoryOutputFileNames([
      "types:Normal",
      "category:Normal",
      "regions:Kanto",
    ]);

    expect(names.get("regions:Kanto")).toBe("kanto-stats.json");
    expect(names.get("category:Normal")).toBe("normal-stats.json");
    expect(names.get("types:Normal")).toBe("normal-2-stats.json");
  });
});
