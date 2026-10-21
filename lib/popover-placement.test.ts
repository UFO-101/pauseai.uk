import { describe, expect, it } from "vitest";
import { placeUnder } from "./popover-placement";

const box = { width: 300, gutter: 16 };

describe("placeUnder", () => {
  it("centres the box on the button when there's room", () => {
    const placed = placeUnder({ ...box, anchorLeft: 500, anchorWidth: 100, viewportWidth: 1200 });
    expect(placed).toEqual({ left: -100, point: 150 });
  });

  it("stops at the left gutter, the point following the button", () => {
    const placed = placeUnder({ ...box, anchorLeft: 40, anchorWidth: 100, viewportWidth: 1200 });
    expect(placed).toEqual({ left: -24, point: 74 });
  });

  it("stops at the right gutter", () => {
    const placed = placeUnder({ ...box, anchorLeft: 1000, anchorWidth: 100, viewportWidth: 1200 });
    // The box's left is at 884, so it ends 16px from the right edge.
    expect(placed).toEqual({ left: -116, point: 166 });
  });

  it("keeps the point in from the corners when the button is at the box's edge", () => {
    expect(placeUnder({ ...box, anchorLeft: 0, anchorWidth: 20, viewportWidth: 1200 }).point).toBe(20);
    expect(placeUnder({ ...box, anchorLeft: 1180, anchorWidth: 20, viewportWidth: 1200 }).point).toBe(280);
  });

  it("keeps the left gutter when the box is wider than the room between them", () => {
    const placed = placeUnder({ ...box, anchorLeft: 100, anchorWidth: 100, viewportWidth: 320 });
    expect(placed).toEqual({ left: -84, point: 134 });
  });
});
