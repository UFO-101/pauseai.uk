import { describe, expect, it } from "vitest";
import { isMarchPromoted, march, marchEventJsonLd } from "./march";

describe("marchEventJsonLd", () => {
  it("describes the march as a free, in-person event at its start, linking to its page and Luma", () => {
    const data = marchEventJsonLd();
    expect(data).toMatchObject({
      "@type": "Event",
      name: "March Against AI Extinction",
      startDate: "2026-11-21T12:00:00Z",
      endDate: "2026-11-21T15:00:00Z",
      location: { name: "All Souls' Place", address: { postalCode: "W1B 3DA" } },
      offers: { url: "https://luma.com/pauseai-nov26", price: "0" },
      url: "https://pauseai.uk/protests/march-against-ai-extinction-nov-26/",
    });
    expect(data.image).toEqual(["https://pauseai.uk/images/march-nov-26/luma-cover.webp"]);
  });
});

describe("isMarchPromoted", () => {
  it("is promoted before and on the day after the march", () => {
    expect(isMarchPromoted(new Date("2026-10-15T09:00:00Z"))).toBe(true);
    expect(isMarchPromoted(new Date("2026-11-22T23:59:59Z"))).toBe(true);
  });

  it("stops at the start of the second day after", () => {
    expect(isMarchPromoted(new Date("2026-11-23T00:00:00Z"))).toBe(false);
    expect(isMarchPromoted(new Date("2027-01-01T00:00:00Z"))).toBe(false);
  });

  it("ends after it starts, and is promoted until after it ends", () => {
    expect(new Date(march.endAt) > new Date(march.startAt)).toBe(true);
    expect(new Date(march.promoteUntil) > new Date(march.endAt)).toBe(true);
  });
});
