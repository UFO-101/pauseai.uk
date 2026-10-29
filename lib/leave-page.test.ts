import { afterEach, describe, expect, it, vi } from "vitest";
import { leavePage } from "./leave-page";

afterEach(() => vi.unstubAllGlobals());

describe("leavePage", () => {
  it("goes to the page in the browser", () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });
    leavePage("/staff/asks/new");
    expect(assign).toHaveBeenCalledWith("/staff/asks/new");
  });
});
