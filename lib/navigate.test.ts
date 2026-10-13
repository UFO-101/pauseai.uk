import { afterEach, describe, expect, it, vi } from "vitest";
import { navigate } from "./navigate";

afterEach(() => vi.unstubAllGlobals());

describe("navigate", () => {
  it("loads the URL as a new page", () => {
    const location = { href: "https://pauseai.uk/donate" };
    vi.stubGlobal("window", { location });
    navigate("https://donate.stripe.com/x");
    expect(location.href).toBe("https://donate.stripe.com/x");
  });
});
