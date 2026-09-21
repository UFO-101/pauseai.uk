import { QR_PANEL_PAD, qrMatrix } from "./qr";
import { BRAND_ORANGE, INK } from "./themes";

/** One dark module, in px relative to the top-left of the QR panel. */
export interface QrCell {
  x: number;
  y: number;
  /** Side length. */
  s: number;
}

export interface QrShape {
  size: number;
  /** Modules per side. Denser codes need to be printed bigger. */
  modules: number;
  panelRadius: number;
  cellRadius: number;
  cells: QrCell[];
  centre: { x: number; y: number };
  /** Radius of the pause symbol in the middle, or null when the code has no logo. */
  logoRadius: number | null;
}

/**
 * The geometry of a QR code: a rounded panel, rounded modules, and optionally the
 * pause symbol in the middle. The canvas designs and the standalone generator both
 * read this, so a code looks the same wherever it appears.
 */
export function qrShape(target: string, size: number, logo: boolean): QrShape {
  const matrix = qrMatrix(target);
  const modules = matrix.length;
  const pad = size * QR_PANEL_PAD;
  const cell = (size - pad * 2) / modules;
  const centre = { x: size / 2, y: size / 2 };
  const clear = size * 0.24;

  const cells: QrCell[] = [];
  matrix.forEach((row, r) =>
    row.forEach((dark, c) => {
      if (!dark) return;
      // Leave room for the logo. The highest error correction level covers the gap.
      if (logo && Math.hypot(pad + (c + 0.5) * cell - centre.x, pad + (r + 0.5) * cell - centre.y) < clear * 0.72) return;
      cells.push({ x: pad + c * cell, y: pad + r * cell, s: cell });
    }),
  );

  return { size, modules, panelRadius: size * 0.08, cellRadius: cell * 0.3, cells, centre, logoRadius: logo ? clear / 2 : null };
}

/** Pause symbol bars, relative to the logo radius. */
export function pauseBars(r: number) {
  const w = r * 0.26;
  const h = r * 0.9;
  return { w, h, leftX: -w * 1.5, rightX: w * 0.5, y: -h / 2 };
}

const n = (v: number) => Number(v.toFixed(2));

/** Standalone SVG for the QR code. Vector, so it stays sharp at any print size. */
export function qrSvg(shape: QrShape, opts: { background: string | null }): string {
  const { size, cells, cellRadius, centre, logoRadius, panelRadius } = shape;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${n(size)} ${n(size)}">`,
  ];
  if (opts.background) parts.push(`<rect width="${n(size)}" height="${n(size)}" rx="${n(panelRadius)}" fill="${opts.background}"/>`);
  parts.push(`<g fill="${INK}">`);
  for (const c of cells) parts.push(`<rect x="${n(c.x)}" y="${n(c.y)}" width="${n(c.s)}" height="${n(c.s)}" rx="${n(cellRadius)}"/>`);
  parts.push("</g>");
  if (logoRadius !== null) {
    const bars = pauseBars(logoRadius);
    parts.push(`<circle cx="${n(centre.x)}" cy="${n(centre.y)}" r="${n(logoRadius)}" fill="${BRAND_ORANGE}"/>`);
    parts.push(
      `<g fill="#FFFFFF"><rect x="${n(centre.x + bars.leftX)}" y="${n(centre.y + bars.y)}" width="${n(bars.w)}" height="${n(bars.h)}"/>` +
        `<rect x="${n(centre.x + bars.rightX)}" y="${n(centre.y + bars.y)}" width="${n(bars.w)}" height="${n(bars.h)}"/></g>`,
    );
  }
  parts.push("</svg>");
  return parts.join("\n");
}
