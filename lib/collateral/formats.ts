export type AspectClass = "square" | "portrait" | "story" | "landscape" | "banner";
export type FormatGroup = "Social" | "Events" | "Slides" | "Print";

export const PRINT_DPI = 300;
export const BLEED_MM = 3;

interface FormatBase {
  id: string;
  label: string;
  group: FormatGroup;
  note?: string;
}

export interface DigitalFormat extends FormatBase {
  kind: "digital";
  width: number;
  height: number;
}

export interface PrintFormat extends FormatBase {
  kind: "print";
  widthMm: number;
  heightMm: number;
}

export type Format = DigitalFormat | PrintFormat;

export const FORMATS: Format[] = [
  { id: "ig-square", label: "Instagram / Facebook square", group: "Social", kind: "digital", width: 1080, height: 1080 },
  { id: "ig-portrait", label: "Instagram portrait (4:5)", group: "Social", kind: "digital", width: 1080, height: 1350 },
  { id: "story", label: "Story / Reel / TikTok / WhatsApp status", group: "Social", kind: "digital", width: 1080, height: 1920 },
  { id: "x-post", label: "X / Twitter post", group: "Social", kind: "digital", width: 1600, height: 900 },
  { id: "link-share", label: "LinkedIn / Facebook link share", group: "Social", kind: "digital", width: 1200, height: 630 },
  { id: "fb-event", label: "Facebook event cover", group: "Social", kind: "digital", width: 1920, height: 1005 },
  { id: "x-header", label: "X header", group: "Social", kind: "digital", width: 1500, height: 500 },
  { id: "luma-cover", label: "Luma event cover", group: "Events", kind: "digital", width: 1080, height: 1080, note: "Square, works for Luma cards and pages." },
  { id: "slide", label: "Slide / Zoom background (16:9)", group: "Slides", kind: "digital", width: 1920, height: 1080 },
  { id: "a6", label: "A6 handout", group: "Print", kind: "print", widthMm: 105, heightMm: 148 },
  { id: "a5", label: "A5 flyer", group: "Print", kind: "print", widthMm: 148, heightMm: 210 },
  { id: "a4", label: "A4 poster", group: "Print", kind: "print", widthMm: 210, heightMm: 297 },
  { id: "a3", label: "A3 poster", group: "Print", kind: "print", widthMm: 297, heightMm: 420 },
];

export const DEFAULT_FORMAT_ID = "ig-square";

export function getFormat(id: string): Format {
  return FORMATS.find((f) => f.id === id) ?? FORMATS.find((f) => f.id === DEFAULT_FORMAT_ID)!;
}

export function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm / 25.4) * dpi);
}

// iOS Safari refuses canvases much above ~16.7M pixels, so A3 at 300 dpi
// (~17.4M) is scaled down until it fits.
export const MAX_CANVAS_PIXELS = 16_000_000;

export interface RenderSize {
  width: number;
  height: number;
  /** Pixels of bleed on each edge, 0 for digital formats or when bleed is off. */
  bleedPx: number;
  /** Effective dpi for print formats, undefined for digital. */
  dpi?: number;
}

export function renderSize(format: Format, opts: { bleed?: boolean } = {}): RenderSize {
  if (format.kind === "digital") {
    return { width: format.width, height: format.height, bleedPx: 0 };
  }
  const bleedMm = opts.bleed ? BLEED_MM : 0;
  const wMm = format.widthMm + bleedMm * 2;
  const hMm = format.heightMm + bleedMm * 2;
  let dpi = PRINT_DPI;
  while (mmToPx(wMm, dpi) * mmToPx(hMm, dpi) > MAX_CANVAS_PIXELS && dpi > 100) dpi -= 10;
  return {
    width: mmToPx(wMm, dpi),
    height: mmToPx(hMm, dpi),
    bleedPx: mmToPx(bleedMm, dpi),
    dpi,
  };
}

export function aspectClass(width: number, height: number): AspectClass {
  const r = width / height;
  if (r >= 2.2) return "banner";
  if (r >= 1.15) return "landscape";
  if (r > 0.85) return "square";
  if (r > 0.6) return "portrait";
  return "story";
}

/** Outer margin of a layout, in design units (1000 units = the square root of the trim area). */
export function layoutMarginUnits(cls: AspectClass): number {
  return cls === "banner" ? 44 : cls === "landscape" ? 60 : 72;
}

export const FORMAT_GROUPS: FormatGroup[] = ["Social", "Events", "Slides", "Print"];

export function formatDimensionLabel(format: Format): string {
  return format.kind === "digital"
    ? `${format.width} × ${format.height} px`
    : `${format.widthMm} × ${format.heightMm} mm`;
}
