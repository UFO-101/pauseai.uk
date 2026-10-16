import { describe, expect, it } from "vitest";
import { board } from "./board";
import { HERO_PHOTOS } from "./hero-photos";
import { localGroups } from "./local-groups";
import { staff } from "./staff";

// The image files themselves are checked in tests/checks/public-assets.test.ts.
describe("small content lists", () => {
  it("gives every board member a role, photo and links", () => {
    expect(board.length).toBeGreaterThan(0);
    for (const member of board) {
      expect(member.role, member.name).not.toBe("");
      expect(member.website, member.name).toMatch(/^https:\/\//);
      expect(member.x, member.name).toMatch(/^https:\/\/x\.com\//);
    }
  });

  it("gives every staff member a role and bio", () => {
    for (const member of staff) {
      expect(member.role, member.name).not.toBe("");
      expect(member.bio, member.name).not.toBe("");
    }
  });

  it("has hero photos with alt text and dimensions", () => {
    for (const [src, alt, width, height] of HERO_PHOTOS) {
      expect(alt, src).not.toBe("");
      expect(width * height, src).toBeGreaterThan(0);
    }
  });

  it("only gives a local group a header logo with its dimensions", () => {
    for (const group of localGroups) {
      if (!group.logo) continue;
      expect(group.logo.width * group.logo.height, group.name).toBeGreaterThan(0);
    }
  });
});
