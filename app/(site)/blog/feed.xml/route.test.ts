import { describe, expect, it } from "vitest";
import { posts } from "@/lib/content/blog";
import { GET } from "./route";

describe("GET /blog/feed.xml", () => {
  it("serves every post as Atom", async () => {
    const response = GET();
    expect(response.headers.get("Content-Type")).toBe("application/xml; charset=utf-8");
    expect((await response.text()).match(/<entry>/g)).toHaveLength(posts.length);
  });
});
