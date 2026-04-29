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

    trackEvent("clicked", { value: 1 }, callback);

    expect(window.sa_event).toHaveBeenCalledWith("clicked", { value: 1 });
    expect(callback).toHaveBeenCalled();
  });

  it("still runs callback when analytics is not loaded", () => {
    const callback = vi.fn();
    trackEvent("clicked", undefined, callback);
    expect(window.sa_event).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalled();
  });
});
