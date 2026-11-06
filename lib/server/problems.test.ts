import { afterEach, expect, it, vi } from "vitest";
import { describeError, problem } from "./problems";
import { currentRun, inRun } from "./run-store";

afterEach(() => vi.restoreAllMocks());

it("describes an error with what caused it, a few deep, and anything else as it is", () => {
  const refused = new Error("connect ECONNREFUSED");
  const failed = new Error("fetch failed", { cause: refused });
  expect(describeError(failed)).toBe("fetch failed (connect ECONNREFUSED)");
  expect(describeError(new Error("plain"))).toBe("plain");
  expect(describeError(new Error("", { cause: "a string" }))).toBe("Error (a string)");
  expect(describeError("not an Error")).toBe("not an Error");
  expect(describeError(42)).toBe("42");
  let deep: Error = new Error("bottom");
  for (let i = 0; i < 6; i++) deep = new Error(`level ${i}`, { cause: deep });
  expect(describeError(deep)).toBe("level 5 (level 4) (level 3) (level 2) (level 1)");
  const nameless = new Error("", { cause: new Error("") });
  expect(describeError(nameless)).toBe("Error (Error)");
});

it("keeps a problem on the run in progress, and only logs one outside a run", async () => {
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  expect(currentRun()).toBeUndefined();
  problem("Nothing to keep it on", new Error("outside"));
  expect(logged).toHaveBeenCalledWith("Nothing to keep it on", "outside");
  const kept = await inRun(async (run) => {
    problem("Luma wouldn't give an event", new Error("Luma answered 503", { cause: new Error("timeout") }));
    problem("A note with no error");
    problem("Told by an alert of its own", undefined, { told: true });
    expect(currentRun()).toBe(run);
    await Promise.resolve();
    problem("Still the same run after an await");
    return run.problems;
  });
  expect(kept).toEqual([
    { what: "Luma wouldn't give an event", error: "Luma answered 503 (timeout)" },
    { what: "A note with no error" },
    { what: "Told by an alert of its own", told: true },
    { what: "Still the same run after an await" },
  ]);
  expect(logged).toHaveBeenCalledWith("A note with no error");
  expect(currentRun()).toBeUndefined();
});

it("keeps two runs at once apart", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const [a, b] = await Promise.all([
    inRun(async (run) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      problem("in a");
      return run.problems.map((p) => p.what);
    }),
    inRun(async (run) => {
      problem("in b");
      await new Promise((resolve) => setTimeout(resolve, 10));
      return run.problems.map((p) => p.what);
    }),
  ]);
  expect(a).toEqual(["in a"]);
  expect(b).toEqual(["in b"]);
});
