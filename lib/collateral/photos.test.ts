import { existsSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { LIBRARY_PHOTOS } from "./photos";

describe("LIBRARY_PHOTOS", () => {
  it("has unique ids", () => {
    const ids = LIBRARY_PHOTOS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(LIBRARY_PHOTOS)("$id points at files that exist in public/", (photo) => {
    expect(existsSync(join(process.cwd(), "public", photo.src))).toBe(true);
    expect(existsSync(join(process.cwd(), "public", photo.thumb))).toBe(true);
  });
});
