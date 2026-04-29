import { describe, expect, it } from "vitest";
import {
  CATEGORY_COLORS,
  CATEGORY_TYPE_COLORS,
  CATEGORY_TYPE_LABELS,
  DEX_DIFFICULTY_COLORS,
  EVOLUTION_COLORS,
  GRID_SIZE,
  MOVE_TYPE_ICON_MAP,
  REGION_COLORS,
  TYPE_COLORS,
} from "./constants";

describe("shared/constants", () => {
  it("exposes expected UI constants", () => {
    expect(GRID_SIZE).toBe(3);
    expect(TYPE_COLORS.Fire).toBeDefined();
    expect(REGION_COLORS.Kanto).toBeDefined();
    expect(EVOLUTION_COLORS["First Stage"]).toBeDefined();
    expect(CATEGORY_COLORS.Legendary).toBeDefined();
    expect(DEX_DIFFICULTY_COLORS.Expert).toBeDefined();
    expect(CATEGORY_TYPE_LABELS.types).toBe("Types");
    expect(CATEGORY_TYPE_COLORS.types).toBeDefined();
    expect(MOVE_TYPE_ICON_MAP.Earthquake).toBe("ground");
  });
});
