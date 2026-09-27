import { normaliseUrl, QR_PANEL_PAD } from "./qr";
import { fitText } from "./text";

/**
 * Text printed under a standalone QR code: an optional label, like "Join PauseAI UK", and optionally the link the
 * code opens, so people without a camera can still type it.
 */
export interface QrCaption {
  label: string;
  link: string;
}

export type CaptionKind = "label" | "link";

/** The label is set like a headline, the link like body text. Both families are declared in collateral.css. */
export const CAPTION_FONTS: Record<CaptionKind, { family: string; weight: number; file: string; weightRange: string }> = {
  label: { family: "PAI Lato", weight: 900, file: "/fonts/lato-latin-900-normal.woff2", weightRange: "900" },
  link: { family: "PAI Inter", weight: 500, file: "/fonts/inter-latin-wght-normal.woff2", weightRange: "100 900" },
};

/** Canvas and SVG font shorthand, with fallbacks for SVGs opened where the embedded fonts are not supported. */
export function captionFont(kind: CaptionKind, fontSize: number): string {
  const { family, weight } = CAPTION_FONTS[kind];
  const fallback = kind === "label" ? "Lato, Arial, sans-serif" : "Inter, Arial, sans-serif";
  return `${weight} ${fontSize}px "${family}", ${fallback}`;
}

export interface CaptionLine {
  kind: CaptionKind;
  text: string;
  fontSize: number;
  /** Alphabetic baseline, in px from the top of the whole image. Text is centred horizontally. */
  baseline: number;
}

export interface CaptionLayout {
  /** Height of the whole image: the square code panel plus the caption under it. */
  height: number;
  lines: CaptionLine[];
  /** True when some text only fits by going past the edges, even at its smallest size. */
  overflow: boolean;
}

/** Width of `text` in the given caption font, in px. Injected so tests can run without a canvas. */
export type CaptionMeasure = (kind: CaptionKind, text: string, fontSize: number) => number;

/** How a link reads in print: "pauseai.uk/join", not "https://pauseai.uk/join/". */
export function displayLink(input: string): string {
  const url = normaliseUrl(input);
  if (!url) return "";
  return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
}

/** Where the baseline sits inside a line box, as a share of the line height. */
const BASELINE_IN_LINE = 0.8;

/**
 * Lays the caption out under a `size` px square code panel. Everything scales with `size`, so the preview, the SVG and
 * the PNG all wrap the same way.
 */
export function captionLayout(size: number, caption: QrCaption, measure: CaptionMeasure): CaptionLayout {
  const label = caption.label.trim();
  const link = caption.link.trim();
  if (!label && !link) return { height: size, lines: [], overflow: false };

  // The code panel's own padding already leaves a gap under the code, so the caption starts right below the panel.
  const pad = size * QR_PANEL_PAD;
  const maxWidth = size - pad * 2;
  const lines: CaptionLine[] = [];
  let overflow = false;
  let y = size;

  const block = (kind: CaptionKind, text: string, maxFont: number, minFont: number, maxLines: number) => {
    const lineHeight = 1.2;
    const fit = fitText((t, f) => measure(kind, t, f), text, {
      maxWidth,
      maxHeight: maxFont * lineHeight * maxLines,
      maxFont,
      minFont,
      lineHeight,
    });
    overflow ||= fit.overflow;
    fit.lines.forEach((line, i) => {
      lines.push({ kind, text: line, fontSize: fit.fontSize, baseline: y + (i + BASELINE_IN_LINE) * fit.lineHeightPx });
    });
    y += fit.height;
  };

  if (label) block("label", label, size * 0.085, size * 0.05, 2);
  if (label && link) y += size * 0.01;
  // Links have no spaces to wrap at, so they stay on one line and shrink instead.
  if (link) block("link", link, size * 0.055, size * 0.03, 1);

  return { height: Math.ceil(y + pad), lines, overflow };
}

let fontCssPromise: Promise<string> | null = null;

/**
 * @font-face rules with both caption fonts inlined, for SVG downloads, so the text looks the same wherever the file
 * is opened. About 95 KB, so it is only fetched once a caption is used.
 */
export function captionFontCss(): Promise<string> {
  fontCssPromise ??= Promise.all(
    Object.values(CAPTION_FONTS).map(async ({ family, file, weightRange }) => {
      const res = await fetch(file);
      if (!res.ok) throw new Error(`Could not load ${file}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return `@font-face{font-family:"${family}";font-weight:${weightRange};src:url(data:font/woff2;base64,${btoa(binary)}) format("woff2");}`;
    }),
  )
    .then((rules) => rules.join(""))
    .catch((e) => {
      // Let a later call try again.
      fontCssPromise = null;
      throw e;
    });
  return fontCssPromise;
}
