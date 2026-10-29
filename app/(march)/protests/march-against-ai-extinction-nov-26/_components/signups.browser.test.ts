import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "vitest-browser-react";
import { fetchMarchSignups, SIGNUPS_REFRESH_MS, useMarchSignups } from "./signups";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("fetchMarchSignups", () => {
  it("asks the march's count endpoint and gives back its count", async () => {
    const fetch = vi.spyOn(window, "fetch").mockResolvedValue(Response.json({ count: 1234 }));
    expect(await fetchMarchSignups()).toBe(1234);
    expect(fetch).toHaveBeenCalledWith("/api/march/signups");
  });

  it("gives back null when Luma couldn't say", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(Response.json({ count: null }));
    expect(await fetchMarchSignups()).toBeNull();
  });

  it("throws when the server errs", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(new Response("Internal Server Error", { status: 500 }));
    await expect(fetchMarchSignups()).rejects.toThrow("The march's count answered 500");
  });
});

describe("useMarchSignups", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  });

  /** Each count `load` gives, in turn, the last over and over. */
  const loader = (...answers: (number | null | Error)[]) => {
    const load = vi.fn(async () => {
      const answer = answers.length > 1 ? answers.shift()! : answers[0];
      if (answer instanceof Error) throw answer;
      return answer;
    });
    return load;
  };

  it("starts from the page's count and asks again each minute", async () => {
    const load = loader(1240, 1250);
    const { result } = await renderHook(() => useMarchSignups(1234, load));
    expect(result.current).toBe(1234);
    expect(load).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(SIGNUPS_REFRESH_MS);
    await expect.poll(() => result.current).toBe(1240);
    await vi.advanceTimersByTimeAsync(SIGNUPS_REFRESH_MS);
    await expect.poll(() => result.current).toBe(1250);
  });

  it("shows a count once there is one, from none", async () => {
    const { result } = await renderHook(() => useMarchSignups(null, loader(7)));
    expect(result.current).toBeNull();
    await vi.advanceTimersByTimeAsync(SIGNUPS_REFRESH_MS);
    await expect.poll(() => result.current).toBe(7);
  });

  it("keeps the last count when Luma can't say or the server can't be reached", async () => {
    const load = loader(null, new Error("offline"));
    const { result } = await renderHook(() => useMarchSignups(1234, load));
    await vi.advanceTimersByTimeAsync(SIGNUPS_REFRESH_MS * 2);
    await expect.poll(() => load.mock.calls.length).toBe(2);
    expect(result.current).toBe(1234);
  });

  it("doesn't ask while the page is out of sight", async () => {
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    const load = loader(1240);
    await renderHook(() => useMarchSignups(1234, load));
    await vi.advanceTimersByTimeAsync(SIGNUPS_REFRESH_MS);
    expect(load).not.toHaveBeenCalled();
  });

  it("asks at once when the page comes back into view", async () => {
    const load = loader(1240);
    const { result } = await renderHook(() => useMarchSignups(1234, load));
    document.dispatchEvent(new Event("visibilitychange"));
    await expect.poll(() => result.current).toBe(1240);
  });

  it("stops asking once it's gone", async () => {
    const load = loader(1240);
    const { unmount } = await renderHook(() => useMarchSignups(1234, load));
    await unmount();
    await vi.advanceTimersByTimeAsync(SIGNUPS_REFRESH_MS);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(load).not.toHaveBeenCalled();
  });

  it("asks the march's count endpoint when not given a load", async () => {
    const fetch = vi.spyOn(window, "fetch").mockResolvedValue(Response.json({ count: 1240 }));
    const { result } = await renderHook(() => useMarchSignups(1234));
    await vi.advanceTimersByTimeAsync(SIGNUPS_REFRESH_MS);
    await expect.poll(() => result.current).toBe(1240);
    expect(fetch).toHaveBeenCalledWith("/api/march/signups");
  });
});
