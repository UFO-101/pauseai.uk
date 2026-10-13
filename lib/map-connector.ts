/** Edges of a box, as from getBoundingClientRect(). */
export type Box = { left: number; right: number; top: number; height: number; width: number };

/** How far a connector stops short of the pin's centre, so it doesn't cut through the dot. */
export const PIN_CLEARANCE = 9;

/**
 * The SVG path joining a local group's card to its pin on the map, in the
 * coordinates of `wrap`: a short horizontal stub out of the card's inner edge,
 * then a straight line to just short of the pin.
 */
export function connectorPath(card: Box, pin: Box, wrap: Box, cardOnLeft: boolean): string {
  const cx = (cardOnLeft ? card.right : card.left) - wrap.left;
  const cy = card.top + card.height / 2 - wrap.top;
  const px = pin.left + pin.width / 2 - wrap.left;
  const py = pin.top + pin.height / 2 - wrap.top;
  const stubX = cx + (cardOnLeft ? 14 : -14);
  const dx = px - stubX;
  const dy = py - cy;
  // A pin exactly at the end of the stub has no direction; any will do.
  const dist = Math.hypot(dx, dy) || 1;
  const endX = px - (dx / dist) * PIN_CLEARANCE;
  const endY = py - (dy / dist) * PIN_CLEARANCE;
  return `M${cx},${cy} H${stubX} L${endX},${endY}`;
}
