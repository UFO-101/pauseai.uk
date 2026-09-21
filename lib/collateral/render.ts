import { renderSize, type Format } from "./formats";
import { FONT_LOADS, type Drawable, type PhotoSettings, type Template, type Values } from "./templates";
import type { QrCode } from "./qr";
import type { Theme } from "./themes";

export async function loadFonts(): Promise<void> {
  await Promise.all(FONT_LOADS.map((f) => document.fonts.load(f)));
}

const imageCache = new Map<string, Promise<Drawable>>();

function decodeImage(src: string): Promise<Drawable> {
  return new Promise<Drawable>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Could not load the image"));
    img.src = src;
  });
}

/** Loads a same-origin image (logo or library photo). Cached so redraws stay instant. */
export function loadImage(src: string): Promise<Drawable> {
  let cached = imageCache.get(src);
  if (!cached) {
    cached = decodeImage(src);
    imageCache.set(src, cached);
  }
  return cached;
}

/** Loads a photo embedded in a saved project. Not cached, since the string is large. */
export function loadDataUrl(dataUrl: string): Promise<Drawable> {
  return decodeImage(dataUrl);
}

/** Downscales a photo and encodes it as a JPEG data URL, so a saved project stays a reasonable size. */
export function drawableToJpegDataUrl(photo: Drawable, maxSide = 2400, quality = 0.9): string {
  const scale = Math.min(1, maxSide / Math.max(photo.width, photo.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(photo.width * scale));
  canvas.height = Math.max(1, Math.round(photo.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser");
  // JPEG has no transparency, so put PNG cut-outs on white rather than black.
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(photo.source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

/** Reads a volunteer's uploaded photo. It never leaves the browser. */
export async function fileToDrawable(file: File): Promise<Drawable> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  return { source: bitmap, width: bitmap.width, height: bitmap.height };
}

export interface RenderOptions {
  format: Format;
  template: Template;
  theme: Theme;
  values: Values;
  logo: Drawable;
  photo: Drawable | null;
  photoSettings: PhotoSettings;
  qrCodes: QrCode[];
  trackQr: boolean;
  /** Include bleed (print formats only). */
  bleed?: boolean;
  /** Scale output down so its longest side is at most this many px. Used for the live preview. */
  maxSide?: number;
}

/** Draws the collateral into `canvas`, sizing the canvas to match. Returns the final pixel size. */
export function renderCollateral(canvas: HTMLCanvasElement, opts: RenderOptions) {
  const size = renderSize(opts.format, { bleed: opts.bleed });
  const scale = opts.maxSide ? Math.min(1, opts.maxSide / Math.max(size.width, size.height)) : 1;
  const width = Math.max(1, Math.round(size.width * scale));
  const height = Math.max(1, Math.round(size.height * scale));
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser");
  opts.template.draw({
    ctx,
    width,
    height,
    bleedPx: Math.round(size.bleedPx * scale),
    scale,
    dpi: size.dpi,
    theme: opts.theme,
    values: opts.values,
    logo: opts.logo,
    photo: opts.photo,
    photoSettings: opts.photoSettings,
    qrCodes: opts.qrCodes,
    trackQr: opts.trackQr,
  });
  return { width, height };
}
