import { describe, expect, it } from "vitest";
import { lastPlace, leaders, ranks, tallySources } from "./trackers";

const TAGS = ["stratford", "brixton"] as const;
const guest = (utm_source: string | null, approval_status = "approved", registered_at?: string) => ({
  guest: { utm_source, approval_status, registered_at },
});

describe("tallySources", () => {
  it("counts each tag and reports every tag even at zero", () => {
    const result = tallySources([guest("brixton"), guest("brixton")], TAGS);
    expect(result.counts).toEqual({ stratford: 0, brixton: 2 });
    expect(result.total).toBe(2);
  });

  it("matches tags case-insensitively and ignores surrounding whitespace", () => {
    const result = tallySources([guest("Brixton"), guest(" STRATFORD ")], TAGS);
    expect(result.counts).toEqual({ stratford: 1, brixton: 1 });
  });

  it("puts unknown, missing and inherited-property sources in other", () => {
    const result = tallySources([guest("ig"), guest(null), guest("constructor")], TAGS);
    expect(result.other).toBe(3);
    expect(result.counts).toEqual({ stratford: 0, brixton: 0 });
  });

  it("ignores registrations before the cutoff, and any with no timestamp", () => {
    const since = new Date("2026-09-26T11:00:00Z");
    const result = tallySources(
      [
        guest("brixton", "approved", "2026-09-26T10:59:59Z"),
        guest("brixton", "approved", "2026-09-26T11:00:00Z"),
        guest("brixton", "approved", "2026-09-26T14:30:00Z"),
        guest("brixton"),
      ],
      TAGS,
      since
    );
    expect(result.counts.brixton).toBe(2);
    expect(result.total).toBe(2);
  });

  it("stops counting at the end of the window (end exclusive)", () => {
    const since = new Date("2026-09-26T11:00:00Z");
    const until = new Date("2026-09-26T15:00:00Z");
    const result = tallySources(
      [
        guest("brixton", "approved", "2026-09-26T14:59:59Z"),
        guest("brixton", "approved", "2026-09-26T15:00:00Z"),
        guest("brixton", "approved", "2026-09-27T09:00:00Z"),
      ],
      TAGS,
      since,
      until
    );
    expect(result.counts.brixton).toBe(1);
    expect(result.total).toBe(1);
  });

  it("skips declined guests", () => {
    const result = tallySources([guest("brixton", "declined"), guest("brixton")], TAGS);
    expect(result.counts.brixton).toBe(1);
    expect(result.total).toBe(1);
  });
});

describe("leaders", () => {
  it("returns the single top stall", () => {
    expect(leaders({ stratford: 3, brixton: 7, angel: 0 })).toEqual(["brixton"]);
  });

  it("returns every stall on a tie", () => {
    expect(leaders({ stratford: 5, brixton: 5, angel: 1 })).toEqual(["stratford", "brixton"]);
  });

  it("returns nobody when there are no signups", () => {
    expect(leaders({ stratford: 0, brixton: 0 })).toEqual([]);
  });
});

describe("ranks", () => {
  it("ranks by count, highest first", () => {
    expect(ranks({ a: 3, b: 9, c: 5 })).toEqual({ a: 3, b: 1, c: 2 });
  });

  it("shares a rank on a tie and skips the next", () => {
    expect(ranks({ a: 5, b: 5, c: 3, d: 1 })).toEqual({ a: 1, b: 1, c: 3, d: 4 });
  });

  it("leaves stalls with no signups unranked", () => {
    expect(ranks({ a: 2, b: 0 })).toEqual({ a: 1, b: null });
  });
});

describe("lastPlace", () => {
  it("returns the stall with the fewest, even if that is zero", () => {
    expect(lastPlace({ a: 5, b: 0, c: 2 })).toEqual(["b"]);
  });

  it("returns every stall on a tie for last", () => {
    expect(lastPlace({ a: 5, b: 1, c: 1 })).toEqual(["b", "c"]);
  });

  it("returns nobody when every stall is level", () => {
    expect(lastPlace({ a: 0, b: 0 })).toEqual([]);
    expect(lastPlace({ a: 4, b: 4 })).toEqual([]);
  });
});
