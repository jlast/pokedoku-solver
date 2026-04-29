import { describe, expect, it } from "vitest";
import { DEFAULT_OG_IMAGE, SITE_URL, absoluteUrl } from "./site";

describe("astro/lib/site", () => {
  it("builds absolute URLs", () => {
    expect(absoluteUrl("/tips/")).toBe(`${SITE_URL}/tips/`);
    expect(absoluteUrl("tips/")).toBe(`${SITE_URL}/tips/`);
    expect(DEFAULT_OG_IMAGE).toBe(`${SITE_URL}/og-image.png`);
  });
});
