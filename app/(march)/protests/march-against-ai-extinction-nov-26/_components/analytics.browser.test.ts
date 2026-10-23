import { afterEach, describe, expect, it } from "vitest";
import { track } from "./analytics";

type DataLayerWindow = Window & { dataLayer?: unknown[] };

afterEach(() => {
  delete (window as DataLayerWindow).dataLayer;
});

describe("track", () => {
  it("pushes the event onto GTM's dataLayer, making it if it isn't there yet", () => {
    track({ event: "march_signup" });
    track({ event: "march_share", share_method: "whatsapp" });
    expect((window as DataLayerWindow).dataLayer).toEqual([
      { event: "march_signup" },
      { event: "march_share", share_method: "whatsapp" },
    ]);
  });

  it("adds to the dataLayer GTM already has", () => {
    (window as DataLayerWindow).dataLayer = [{ event: "gtm.js" }];
    track({ event: "march_signup" });
    expect((window as DataLayerWindow).dataLayer).toEqual([{ event: "gtm.js" }, { event: "march_signup" }]);
  });
});
