import { describe, expect, it } from "vitest";
import { EVENT_IMAGE_HOSTS, isAllowedEventImage } from "./event-image-hosts";

describe("isAllowedEventImage", () => {
  it("allows https images from Luma's CDN and Unsplash", () => {
    expect(EVENT_IMAGE_HOSTS).toEqual(["images.lumacdn.com", "images.unsplash.com"]);
    expect(isAllowedEventImage("https://images.lumacdn.com/cover.jpg")).toBe(true);
    expect(isAllowedEventImage("https://images.unsplash.com/photo-1")).toBe(true);
  });

  it("refuses other hosts, plain http and malformed URLs", () => {
    expect(isAllowedEventImage("https://evil.example/cover.jpg")).toBe(false);
    expect(isAllowedEventImage("http://images.lumacdn.com/cover.jpg")).toBe(false);
    expect(isAllowedEventImage("not a url")).toBe(false);
  });
});
