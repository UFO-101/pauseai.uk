import { afterEach, describe, expect, it, vi } from "vitest";
import { track } from "./analytics";

type GtagWindow = Window & { gtag?: (...args: unknown[]) => void; dataLayer?: unknown[] };

afterEach(() => {
  delete (window as GtagWindow).gtag;
  delete (window as GtagWindow).dataLayer;
});

describe("track", () => {
  it("sends the event to GA through gtag, its data as the event's parameters", () => {
    const gtag = vi.fn();
    (window as GtagWindow).gtag = gtag;
    track({ event: "march_signup" });
    track({ event: "march_share", share_method: "whatsapp" });
    expect(gtag.mock.calls).toEqual([
      ["event", "march_signup", {}],
      ["event", "march_share", { share_method: "whatsapp" }],
    ]);
  });

  it("sends nothing, and pushes nothing for GTM, while GA isn't loaded", () => {
    expect(() => track({ event: "march_signup" })).not.toThrow();
    expect((window as GtagWindow).dataLayer).toBeUndefined();
  });
});
