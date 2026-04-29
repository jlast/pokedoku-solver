import { describe, expect, it } from "vitest";
import { formatDate } from "./utils";

describe("shared/utils", () => {
  it("formats yyyy-mm-dd date values", () => {
    expect(formatDate("2025-01-09")).toBe("Jan 9, 2025");
  });
});
