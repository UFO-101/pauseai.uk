// Where a box that hangs under a button goes: centred on the button, but
// kept within the page's side gutters, with its point still under the
// button's middle. Pure, so the measuring and the arithmetic are apart.

export type Placement = {
  /** The box's left edge, from the button's left edge. */
  left: number;
  /** The point's middle, from the box's left edge. */
  point: number;
};

/** The point is kept this far in from the box's corners, which are rounded. */
const POINT_INSET = 20;

export function placeUnder({
  anchorLeft,
  anchorWidth,
  width,
  viewportWidth,
  gutter,
}: {
  /** The button's left edge and width, in the viewport. */
  anchorLeft: number;
  anchorWidth: number;
  /** The box's width. */
  width: number;
  viewportWidth: number;
  /** The least space between the box and the viewport's sides. */
  gutter: number;
}): Placement {
  const middle = anchorLeft + anchorWidth / 2;
  // A box too wide for the gutters keeps the left one.
  const rightmost = Math.max(gutter, viewportWidth - gutter - width);
  const left = Math.min(Math.max(middle - width / 2, gutter), rightmost);
  const point = Math.min(Math.max(middle - left, POINT_INSET), width - POINT_INSET);
  return { left: left - anchorLeft, point };
}
