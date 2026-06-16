import { beforeEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "./analytics";

describe("browser/analytics", () => {
  beforeEach(() => {
    (globalThis as unknown as { document: Document }).document = {
      title: "Test Page",
    } as Document;

    (globalThis as unknown as { window: Window }).window = {
      dataLayer: [],
      gtag: undefined,
    } as unknown as Window;

    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        pathname: "/test-page/",
        href: "https://www.pokedoku-helper.com/test-page/",
      },
    });

  });

  it("tracks event when analytics is loaded", () => {
    const callback = vi.fn();
    window.gtag = vi.fn();

    trackEvent("ui_click", { target: "test", page_name: "test_page" }, callback);

    expect(window.gtag).toHaveBeenCalledWith("event", "ui_click", {
      target: "test",
      page_name: "test_page",
    });
    expect(callback).toHaveBeenCalled();
  });

  it("serializes arrays and booleans", () => {
    window.gtag = vi.fn();

    trackEvent("pokemon_select", {
      target: "pokemon",
      value: "Vulpix",
      pokemon_id: 37,
    });

    expect(window.gtag).toHaveBeenCalledWith("event", "pokemon_select", {
      target: "pokemon",
      value: "Vulpix",
      pokemon_id: 37,
    });
  });

  it("adds grouped path metadata to page views", () => {
    window.gtag = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        pathname: "/pokemon/pikachu-25/",
        href: "https://www.pokedoku-helper.com/pokemon/pikachu-25/",
      },
    });

    trackEvent("page_view", { page_name: "test_page" });

    expect(window.gtag).toHaveBeenCalledWith("event", "page_view", {
      page_name: "test_page",
      page_path: "/pokemon/***",
      page_location: "https://www.pokedoku-helper.com/pokemon/pikachu-25/",
      page_title: "Test Page",
      raw_path: "/pokemon/pikachu-25/",
      route_type: "pokemon",
      pokemon_slug: "pikachu-25",
    });
  });

  it("still runs callback when analytics is not loaded", () => {
    const callback = vi.fn();
    trackEvent("page_view", { page_name: "test_page" }, callback);
    expect(window.gtag).toBeUndefined();
    expect(callback).toHaveBeenCalled();
  });
});
