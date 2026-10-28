/**
 * The faces the studios draw into canvases with, under family names of their own so they never clash with the site's.
 * Added to the page by declareCanvasFonts when a studio first needs them, not declared in a stylesheet: the studio's
 * stylesheet is in a chunk most pages load, and a page that gains these faces as it navigates sets its own Inter, the
 * same file, loading again, so its text is laid out afresh while it's being painted.
 */
export const CANVAS_FONTS = [
  { family: "PAI Lato", weight: "700", file: "/fonts/lato-latin-700-normal.woff2" },
  { family: "PAI Lato", weight: "900", file: "/fonts/lato-latin-900-normal.woff2" },
  { family: "PAI Inter", weight: "100 900", file: "/fonts/inter-latin-wght-normal.woff2" },
  { family: "PAI Permanent Marker", weight: "400", file: "/fonts/permanent-marker-latin-400-normal.woff2" },
  { family: "PAI Montserrat", weight: "800", file: "/fonts/montserrat-latin-800-normal.woff2" },
];

let declared = false;

/**
 * Adds the canvas faces to the page, once, so `document.fonts.load` can load them. Until a face loads, text drawn in
 * it is held back (display "block"), not drawn in a fallback.
 */
export function declareCanvasFonts(): void {
  if (declared) return;
  declared = true;
  for (const { family, weight, file } of CANVAS_FONTS) {
    document.fonts.add(new FontFace(family, `url("${file}") format("woff2")`, { weight, display: "block" }));
  }
}
