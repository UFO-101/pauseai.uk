import { describe, expect, it } from "vitest";
import { briefings } from "@/lib/content/briefings";
import { GET } from "./route";

describe("GET /campaigns/briefings/feed.xml", () => {
  it("serves every briefing as Atom", async () => {
    const response = GET();
    expect(response.headers.get("Content-Type")).toBe("application/xml; charset=utf-8");
    const xml = await response.text();
    expect(xml.match(/<entry>/g)).toHaveLength(briefings.length);
    expect(xml).toContain('<link href="https://pauseai.uk/campaigns/briefings/feed.xml" rel="self"/>');
  });
});
