import { beforeEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "./analytics";

describe("browser/analytics", () => {
  beforeEach(() => {
    (globalThis as unknown as { window: Window }).window = {
      sa_loaded: false,
      sa_event: vi.fn(),
    } as unknown as Window;
  });

  it("tracks event when analytics is loaded", () => {
    const callback = vi.fn();
    window.sa_loaded = true;

    trackEvent("ui_click", { target: "test", page_name: "test_page" }, callback);

    expect(window.sa_event).toHaveBeenCalledWith("ui_click", {
      target: "test",
      page_name: "test_page",
    });
    expect(callback).toHaveBeenCalled();
  });

  it("serializes arrays and booleans", () => {
    window.sa_loaded = true;

    trackEvent("pokemon_select", {
      target: "pokemon",
      value: "Vulpix",
      pokemon_id: 37,
    });

    expect(window.sa_event).toHaveBeenCalledWith("pokemon_select", {
      target: "pokemon",
      value: "Vulpix",
      pokemon_id: 37,
    });
  });

  it("still runs callback when analytics is not loaded", () => {
    const callback = vi.fn();
    trackEvent("page_view", { page_name: "test_page" }, callback);
    expect(window.sa_event).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalled();
  });
});
