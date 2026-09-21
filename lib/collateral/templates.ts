import { aspectClass, layoutMarginUnits, type AspectClass } from "./formats";
import { QR_GAP_UNITS, qrPlan, qrTarget, usableQrCodes, type QrCode } from "./qr";
import { pauseBars, QR_INK, qrShape } from "./qrShape";
import { BRAND_ORANGE, INK, LOGO_ASPECT, type Theme } from "./themes";
import { coverRect, fitText, type Measure } from "./text";

export const DISPLAY_FONT = '"PAI Lato", Lato, system-ui, sans-serif';
export const BODY_FONT = '"PAI Inter", Inter, system-ui, sans-serif';
/** Brush lettering for the Brush layout, and the wide tracked sans that sits under it. */
export const BRUSH_FONT = '"PAI Permanent Marker", "Permanent Marker", "Lato", system-ui, sans-serif';
/** Letter spacing for brush lettering, in em. Negative pulls the letters closer. */
export const BRUSH_TRACKING = -0.02;
export const WIDE_FONT = '"PAI Montserrat", Montserrat, "Inter", system-ui, sans-serif';
export const FONT_LOADS = [
  '400 40px "PAI Permanent Marker"',
  '800 40px "PAI Montserrat"',
  '900 40px "PAI Lato"', '700 40px "PAI Lato"', '500 40px "PAI Inter"', '700 40px "PAI Inter"', '800 40px "PAI Inter"'];

export type Values = Record<string, string>;

export interface Drawable {
  source: CanvasImageSource;
  width: number;
  height: number;
}

export interface PhotoSettings {
  zoom: number;
  focalX: number;
  focalY: number;
  /** 0..1, how much of the photo shows through the theme tint. */
  visible: number;
}

export interface DrawArgs {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  /** Bleed on each edge in px. Backgrounds fill it, content stays out of it. */
  bleedPx: number;
  /** Canvas px per export px: 1 for downloads, below 1 for the live preview. */
  scale: number;
  /** Print resolution at export size. Undefined for digital formats. */
  dpi?: number;
  theme: Theme;
  values: Values;
  logo: Drawable;
  photo: Drawable | null;
  photoSettings: PhotoSettings;
  /** QR codes to draw in the footer, in order. Empty rows are ignored. */
  qrCodes: QrCode[];
  /** Whether QR links get an analytics tag. */
  trackQr: boolean;
}

export interface FieldDef {
  key: string;
  label: string;
  kind: "text" | "textarea" | "toggle";
  maxLength?: number;
  hint?: string;
  default: string;
}

export interface Template {
  id: string;
  label: string;
  description: string;
  fields: FieldDef[];
  draw: (args: DrawArgs) => void;
}

// ---------------------------------------------------------------------------
// Shared drawing helpers

interface Geometry {
  /** Design unit: 1 at 1000px on a side, scales with the trim area. */
  u: number;
  cls: AspectClass;
  left: number;
  right: number;
  top: number;
  bottom: number;
  cw: number;
  logoW: number;
}

function geometry(a: DrawArgs): Geometry {
  const trimW = a.width - 2 * a.bleedPx;
  const trimH = a.height - 2 * a.bleedPx;
  const cls = aspectClass(trimW, trimH);
  const u = Math.sqrt(trimW * trimH) / 1000;
  const marginUnits = layoutMarginUnits(cls);
  const m = a.bleedPx + marginUnits * u;
  const logoUnits = cls === "banner" ? 230 : cls === "story" ? 340 : 300;
  return { u, cls, left: m, right: a.width - m, top: m, bottom: a.height - m, cw: a.width - 2 * m, logoW: logoUnits * u };
}

function font(weight: number | string, size: number, family: string): string {
  return `${weight} ${size}px ${family}`;
}

function measurer(ctx: CanvasRenderingContext2D, weight: number | string, family: string): Measure {
  return (text, size) => {
    ctx.font = font(weight, size, family);
    return ctx.measureText(text).width;
  };
}

function setTracking(ctx: CanvasRenderingContext2D, px: number) {
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px}px`;
}

function paintBackground(a: DrawArgs) {
  const { ctx, width, height, theme, photo, photoSettings } = a;
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);
  if (!photo) return;
  const r = coverRect(photo.width, photo.height, width, height, photoSettings.zoom, photoSettings.focalX, photoSettings.focalY);
  ctx.drawImage(photo.source, r.x, r.y, r.w, r.h);
  ctx.globalAlpha = 1 - photoSettings.visible;
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;
}

/** Logo top-left, "UK · GROUP" top-right. Returns the y of the header's bottom edge. */
function drawHeader(a: DrawArgs, g: Geometry): number {
  const { ctx, theme, values } = a;
  const logoH = g.logoW / LOGO_ASPECT;
  ctx.drawImage(a.logo.source, g.left, g.top, g.logoW, logoH);

  const group = values.group?.trim();
  const label = group ? `UK · ${group}` : "UK";
  const size = (g.cls === "banner" ? 24 : 28) * g.u;
  ctx.save();
  ctx.font = font(800, size, BODY_FONT);
  setTracking(ctx, size * 0.14);
  ctx.fillStyle = theme.accentText;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  // Tracking adds trailing space after the last glyph, so nudge back to the margin.
  ctx.fillText(label.toUpperCase(), g.right + size * 0.14, g.top + logoH / 2);
  ctx.restore();
  return g.top + logoH;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Scannable QR on a light panel: round dots, ring-and-square corner marks, the pause symbol in the middle. */
function drawQr(a: DrawArgs, target: string, x: number, y: number, size: number) {
  const { ctx } = a;
  const shape = qrShape(target, size, true);

  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, x, y, size, size, shape.panelRadius);
  ctx.fill();

  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = QR_INK;
  ctx.beginPath();
  for (const d of shape.dots) {
    ctx.moveTo(d.x + d.r, d.y);
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fill(new Path2D(shape.finderRings), "evenodd");
  for (const e of shape.finderEyes) ctx.fillRect(e.x, e.y, e.s, e.s);

  // Pause symbol
  const r = shape.logoRadius ?? 0;
  const { x: cx, y: cy } = shape.centre;
  ctx.fillStyle = BRAND_ORANGE;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  const bars = pauseBars(r);
  ctx.fillRect(cx + bars.leftX, cy + bars.y, bars.w, bars.h);
  ctx.fillRect(cx + bars.rightX, cy + bars.y, bars.w, bars.h);
  ctx.restore();
}

interface QrLayout {
  codes: QrCode[];
  size: number;
  gap: number;
  labelFont: number;
  /** Height of the label strip under the panels, 0 when no code has a label. */
  labelH: number;
  blockW: number;
  blockH: number;
  /** True when the codes sit beside the CTA, false when they get their own row above it. */
  side: boolean;
}

function qrLayout(a: DrawArgs, g: Geometry): QrLayout | null {
  const codes = usableQrCodes(a.qrCodes);
  if (codes.length === 0) return null;
  // Plan at export size (the preview is scaled down), then scale back to this canvas.
  const plan = qrPlan({
    width: (a.width - 2 * a.bleedPx) / a.scale,
    height: (a.height - 2 * a.bleedPx) / a.scale,
    dpi: a.dpi,
    urls: codes.map((c) => c.url),
    track: a.trackQr,
  });
  if (!plan.ok) return null;
  const shown = codes.slice(0, plan.shown);
  const size = plan.size * a.scale;
  const gap = QR_GAP_UNITS * g.u;
  const labelFont = 22 * g.u;
  const labelH = shown.some((c) => c.label.trim()) ? labelFont * 1.7 : 0;
  const blockW = shown.length * size + (shown.length - 1) * gap;
  return { codes: shown, size, gap, labelFont, labelH, blockW, blockH: size + labelH, side: shown.length === 1 || blockW <= g.cw * 0.42 };
}

function drawQrBlock(a: DrawArgs, q: QrLayout, x: number, y: number) {
  const { ctx, theme } = a;
  const measure = measurer(ctx, 700, BODY_FONT);
  q.codes.forEach((code, i) => {
    const px = x + i * (q.size + q.gap);
    drawQr(a, qrTarget(code.url, a.trackQr), px, y, q.size);
    const label = code.label.trim();
    if (!label) return;
    let size = q.labelFont;
    while (measure(label, size) > q.size && size > q.labelFont * 0.6) size *= 0.94;
    ctx.fillStyle = theme.text;
    ctx.font = font(700, size, BODY_FONT);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(label, px + q.size / 2, y + q.size + q.labelFont * 0.4, q.size);
  });
}

/** CTA pill plus URL and optional QR codes along the bottom margin. Returns the y of the footer's top edge. */
function drawFooter(a: DrawArgs, g: Geometry): number {
  const { ctx, theme, values } = a;
  const cta = values.cta?.trim();
  const url = values.url?.trim();
  const fs = (g.cls === "banner" ? 26 : 30) * g.u;
  const pillH = cta || url ? fs * 1.9 : 0;
  const gap = 26 * g.u;
  const q = qrLayout(a, g);
  const textRight = q?.side ? g.right - q.blockW - gap : g.right;

  const pillText = cta ?? "";
  const pillW = cta ? measurer(ctx, 800, BODY_FONT)(pillText, fs) + fs * 1.8 : 0;
  const urlW = url ? measurer(ctx, 700, BODY_FONT)(url, fs) : 0;
  const stacked = Boolean(cta && url && g.left + pillW + gap + urlW > textRight);
  // When stacked, the URL sits on its own line above the pill.
  const stackH = stacked ? fs * 1.7 : 0;
  const textH = pillH + stackH;

  let pillBottom = g.bottom;
  let top = g.bottom - textH;
  if (q) {
    if (q.side) {
      const qy = g.bottom - q.blockH;
      drawQrBlock(a, q, g.right - q.blockW, qy);
      // Centre the text block on the QR panels.
      pillBottom = Math.min(g.bottom, qy + q.size / 2 + textH / 2);
      top = Math.min(qy, pillBottom - textH);
    } else {
      const qy = g.bottom - textH - (textH ? gap : 0) - q.blockH;
      drawQrBlock(a, q, g.left, qy);
      top = qy;
    }
  }

  const pillY = pillBottom - pillH;
  const urlY = stacked ? pillY - fs * 0.85 : pillY + pillH / 2;
  if (cta) {
    ctx.fillStyle = theme.accent;
    roundRect(ctx, g.left, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.fillStyle = theme.onAccent;
    ctx.font = font(800, fs, BODY_FONT);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(pillText, g.left + fs * 0.9, pillY + pillH / 2 + fs * 0.04);
  }
  if (url) {
    ctx.fillStyle = theme.text;
    ctx.font = font(700, fs, BODY_FONT);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const x = cta && !stacked ? g.left + pillW + gap : g.left;
    ctx.fillText(url, x, urlY);
  }
  return top;
}

function drawLines(ctx: CanvasRenderingContext2D, lines: string[], x: number, y: number, lineHeightPx: number) {
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeightPx));
}

/**
 * Brush lettering, with the capitals centred in each line box. `x` is where the visible left edge of each
 * line's ink goes, so a letter's own side bearing does not leave a gap at the margin or the page edge.
 */
function drawBrushLines(a: DrawArgs, lines: string[], x: number, y: number, size: number, lineHeightPx: number) {
  const { ctx, theme } = a;
  ctx.save();
  ctx.font = font(400, size, BRUSH_FONT);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  setTracking(ctx, size * BRUSH_TRACKING);
  ctx.fillStyle = theme.text;
  const capHeight = ctx.measureText("H").actualBoundingBoxAscent;
  lines.forEach((line, i) => {
    // actualBoundingBoxLeft is how far the ink extends left of the origin (negative when it starts to the right).
    const inkLeft = ctx.measureText(line).actualBoundingBoxLeft;
    ctx.fillText(line, x + inkLeft, y + i * lineHeightPx + (lineHeightPx + capHeight) / 2);
  });
  ctx.restore();
}

function drawKicker(a: DrawArgs, g: Geometry, text: string, x: number, y: number): number {
  const { ctx, theme } = a;
  const size = 30 * g.u;
  ctx.font = font(800, size, BODY_FONT);
  setTracking(ctx, size * 0.16);
  ctx.fillStyle = theme.accentText;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(text.toUpperCase(), x, y);
  setTracking(ctx, 0);
  return size * 1.3;
}

interface Zone {
  top: number;
  bottom: number;
  height: number;
}

function bodyZone(a: DrawArgs, g: Geometry): Zone {
  const headerBottom = drawHeader(a, g);
  const footerTop = drawFooter(a, g);
  const gap = (g.cls === "banner" ? 24 : 44) * g.u;
  const top = headerBottom + gap;
  const bottom = footerTop - gap;
  return { top, bottom, height: Math.max(0, bottom - top) };
}

function maxHeadlineFont(cls: AspectClass, u: number): number {
  const units = { square: 150, portrait: 160, story: 180, landscape: 140, banner: 100 }[cls];
  return units * u;
}

// ---------------------------------------------------------------------------
// Templates

const FOOTER_FIELDS: FieldDef[] = [
  { key: "cta", label: "Button text", kind: "text", maxLength: 28, default: "Join PauseAI UK" },
  { key: "url", label: "Web address", kind: "text", maxLength: 40, default: "pauseai.uk" },
  { key: "group", label: "Local group", kind: "text", maxLength: 24, hint: "e.g. London. Leave blank for national.", default: "" },
];

const announcement: Template = {
  id: "announcement",
  label: "Announcement",
  description: "Big headline with a call to action. Good for social posts and slides.",
  fields: [
    { key: "kicker", label: "Kicker", kind: "text", maxLength: 40, hint: "Small line above the headline", default: "Take action" },
    { key: "headline", label: "Headline", kind: "textarea", maxLength: 90, default: "Safety before superintelligence" },
    { key: "uppercase", label: "Uppercase headline", kind: "toggle", default: "true" },
    { key: "sub", label: "Sub-line", kind: "textarea", maxLength: 140, default: "Community-led action for safe and accountable AI across the UK." },
    ...FOOTER_FIELDS,
  ],
  draw(a) {
    const g = geometry(a);
    paintBackground(a);
    const zone = bodyZone(a, g);
    const { ctx, theme, values } = a;

    const kicker = values.kicker?.trim();
    const kickerH = kicker ? 30 * g.u * 1.3 + 22 * g.u : 0;
    const sub = values.sub?.trim();
    const subReserve = sub ? Math.min(zone.height * 0.3, 200 * g.u) : 0;
    const headlineText = values.uppercase === "true" ? (values.headline ?? "").toUpperCase() : (values.headline ?? "");

    const headline = fitText(measurer(ctx, 900, DISPLAY_FONT), headlineText, {
      maxWidth: g.cw,
      maxHeight: Math.max(0, zone.height - kickerH - subReserve),
      maxFont: maxHeadlineFont(g.cls, g.u),
      minFont: 34 * g.u,
      lineHeight: 1.02,
    });
    const subFit = sub
      ? fitText(measurer(ctx, 500, BODY_FONT), sub, {
          maxWidth: g.cw * (g.cls === "banner" ? 0.8 : 0.92),
          maxHeight: Math.max(0, subReserve - 22 * g.u),
          maxFont: 44 * g.u,
          minFont: 24 * g.u,
          lineHeight: 1.35,
        })
      : null;

    const subH = subFit ? subFit.height + 22 * g.u : 0;
    const total = kickerH + headline.height + subH;
    let y = zone.top + Math.max(0, (zone.height - total) / 2);

    if (kicker) {
      drawKicker(a, g, kicker, g.left, y);
      y += kickerH;
    }
    ctx.fillStyle = theme.text;
    ctx.font = font(900, headline.fontSize, DISPLAY_FONT);
    drawLines(ctx, headline.lines, g.left, y, headline.lineHeightPx);
    y += headline.height;
    if (subFit) {
      y += 22 * g.u;
      ctx.fillStyle = theme.muted;
      ctx.font = font(500, subFit.fontSize, BODY_FONT);
      drawLines(ctx, subFit.lines, g.left, y, subFit.lineHeightPx);
    }
  },
};

const event: Template = {
  id: "event",
  label: "Event",
  description: "Title, date, time and place. For flyers, Luma covers and event posts.",
  fields: [
    { key: "kicker", label: "Kicker", kind: "text", maxLength: 40, default: "Join us" },
    { key: "headline", label: "Event title", kind: "textarea", maxLength: 80, default: "Letter writing night" },
    { key: "uppercase", label: "Uppercase title", kind: "toggle", default: "true" },
    { key: "date", label: "Date", kind: "text", maxLength: 32, default: "Thursday 15 October" },
    { key: "time", label: "Time", kind: "text", maxLength: 24, default: "7pm" },
    { key: "venue", label: "Venue", kind: "text", maxLength: 60, default: "Venue name, City" },
    { key: "blurb", label: "Short description", kind: "textarea", maxLength: 120, default: "Meet local volunteers and write to your MP about AI safety." },
    { ...FOOTER_FIELDS[0], default: "RSVP on Luma" },
    { ...FOOTER_FIELDS[1], default: "luma.com/pauseai.uk" },
    ...FOOTER_FIELDS.slice(2),
  ],
  draw(a) {
    const g = geometry(a);
    paintBackground(a);
    const zone = bodyZone(a, g);
    const { ctx, theme, values } = a;
    const compact = g.cls === "banner";

    const kicker = values.kicker?.trim();
    const kickerH = kicker ? 30 * g.u * 1.3 + 22 * g.u : 0;
    const when = [values.date?.trim(), values.time?.trim()].filter(Boolean).join(" · ");
    const venue = values.venue?.trim();
    const blurb = compact ? "" : (values.blurb?.trim() ?? "");

    const dateSize = (compact ? 34 : 50) * g.u;
    const venueFit = venue
      ? fitText(measurer(ctx, 600, BODY_FONT), venue, {
          maxWidth: g.cw - 30 * g.u,
          maxHeight: 2 * 38 * g.u * 1.25,
          maxFont: (compact ? 28 : 38) * g.u,
          minFont: 22 * g.u,
          lineHeight: 1.25,
        })
      : null;
    const whenFit = when
      ? fitText(measurer(ctx, 800, BODY_FONT), when, {
          maxWidth: g.cw - 30 * g.u,
          maxHeight: dateSize * 1.3 * 2,
          maxFont: dateSize,
          minFont: 24 * g.u,
          lineHeight: 1.25,
        })
      : null;
    const detailsH = (whenFit?.height ?? 0) + (venueFit ? venueFit.height + 6 * g.u : 0);
    const detailsBlock = detailsH ? detailsH + 30 * g.u : 0;

    const blurbReserve = blurb ? Math.min(zone.height * 0.2, 130 * g.u) : 0;
    const blurbFit = blurb
      ? fitText(measurer(ctx, 500, BODY_FONT), blurb, {
          maxWidth: g.cw * 0.92,
          maxHeight: Math.max(0, blurbReserve - 18 * g.u),
          maxFont: 34 * g.u,
          minFont: 22 * g.u,
          lineHeight: 1.35,
        })
      : null;
    const blurbH = blurbFit ? blurbFit.height + 18 * g.u : 0;

    const headlineText = values.uppercase === "true" ? (values.headline ?? "").toUpperCase() : (values.headline ?? "");
    const headline = fitText(measurer(ctx, 900, DISPLAY_FONT), headlineText, {
      maxWidth: g.cw,
      maxHeight: Math.max(0, zone.height - kickerH - detailsBlock - blurbH),
      maxFont: maxHeadlineFont(g.cls, g.u) * 0.9,
      minFont: 34 * g.u,
      lineHeight: 1.02,
    });

    const total = kickerH + headline.height + detailsBlock + blurbH;
    let y = zone.top + Math.max(0, (zone.height - total) / 2);

    if (kicker) {
      drawKicker(a, g, kicker, g.left, y);
      y += kickerH;
    }
    ctx.fillStyle = theme.text;
    ctx.font = font(900, headline.fontSize, DISPLAY_FONT);
    drawLines(ctx, headline.lines, g.left, y, headline.lineHeightPx);
    y += headline.height;

    if (detailsH) {
      y += 30 * g.u;
      const textX = g.left + 30 * g.u;
      ctx.fillStyle = theme.accentText;
      ctx.fillRect(g.left, y, 8 * g.u, detailsH);
      let ty = y;
      if (whenFit) {
        ctx.fillStyle = theme.text;
        ctx.font = font(800, whenFit.fontSize, BODY_FONT);
        drawLines(ctx, whenFit.lines, textX, ty, whenFit.lineHeightPx);
        ty += whenFit.height + 6 * g.u;
      }
      if (venueFit) {
        ctx.fillStyle = theme.muted;
        ctx.font = font(600, venueFit.fontSize, BODY_FONT);
        drawLines(ctx, venueFit.lines, textX, ty, venueFit.lineHeightPx);
      }
      y += detailsH;
    }
    if (blurbFit) {
      y += 18 * g.u;
      ctx.fillStyle = theme.muted;
      ctx.font = font(500, blurbFit.fontSize, BODY_FONT);
      drawLines(ctx, blurbFit.lines, g.left, y, blurbFit.lineHeightPx);
    }
  },
};

const quote: Template = {
  id: "quote",
  label: "Quote",
  description: "A quote or statistic with attribution. For stories and shareable statements.",
  fields: [
    { key: "quote", label: "Quote or statistic", kind: "textarea", maxLength: 220, default: "We can still choose to build AI that is safe and accountable." },
    { key: "name", label: "Name or source", kind: "text", maxLength: 40, default: "Volunteer name" },
    { key: "role", label: "Role or detail", kind: "text", maxLength: 48, default: "PauseAI UK volunteer" },
    { ...FOOTER_FIELDS[0], default: "Read more stories" },
    { ...FOOTER_FIELDS[1], default: "pauseai.uk/people" },
    ...FOOTER_FIELDS.slice(2),
  ],
  draw(a) {
    const g = geometry(a);
    paintBackground(a);
    const zone = bodyZone(a, g);
    const { ctx, theme, values } = a;
    const compact = g.cls === "banner";

    const name = values.name?.trim();
    const role = values.role?.trim();
    const attrH = name || role ? (name ? 34 * g.u * 1.3 : 0) + (role ? 28 * g.u * 1.4 : 0) + 30 * g.u : 0;
    const markH = compact ? 0 : 110 * g.u;

    const q = fitText(measurer(ctx, 700, DISPLAY_FONT), values.quote ?? "", {
      maxWidth: g.cw,
      maxHeight: Math.max(0, zone.height - attrH - markH),
      maxFont: (g.cls === "story" ? 96 : g.cls === "banner" ? 64 : 84) * g.u,
      minFont: 28 * g.u,
      lineHeight: 1.15,
    });

    const total = markH + q.height + attrH;
    let y = zone.top + Math.max(0, (zone.height - total) / 2);

    if (markH) {
      ctx.fillStyle = theme.accentText;
      ctx.font = font(900, 260 * g.u, DISPLAY_FONT);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText("“", g.left - 6 * g.u, y + 210 * g.u);
      y += markH;
    }
    ctx.fillStyle = theme.text;
    ctx.font = font(700, q.fontSize, DISPLAY_FONT);
    drawLines(ctx, q.lines, g.left, y, q.lineHeightPx);
    y += q.height;

    if (attrH) {
      y += 30 * g.u;
      if (name) {
        ctx.font = font(800, 34 * g.u, BODY_FONT);
        setTracking(ctx, 34 * g.u * 0.1);
        ctx.fillStyle = theme.accentText;
        ctx.textBaseline = "top";
        ctx.fillText(name.toUpperCase(), g.left, y);
        setTracking(ctx, 0);
        y += 34 * g.u * 1.3;
      }
      if (role) {
        ctx.font = font(500, 28 * g.u, BODY_FONT);
        ctx.fillStyle = theme.muted;
        ctx.textBaseline = "top";
        ctx.fillText(role, g.left, y);
      }
    }
  },
};

const brush: Template = {
  id: "brush",
  label: "Brush",
  description: "One huge brush-lettered word with a spaced-out line beneath. Bold, campaign style.",
  fields: [
    { key: "headline", label: "Big word", kind: "textarea", maxLength: 30, hint: "Short works best", default: "Safety" },
    { key: "uppercase", label: "Uppercase", kind: "toggle", default: "true" },
    { key: "edge", label: "Run the big word to the edges", kind: "toggle", default: "true" },
    { key: "sub", label: "Line beneath", kind: "textarea", maxLength: 60, default: "Before\nsuperintelligence" },
    ...FOOTER_FIELDS,
  ],
  draw(a) {
    const g = geometry(a);
    paintBackground(a);
    const zone = bodyZone(a, g);
    const { ctx, theme, values } = a;

    const headlineText = values.uppercase === "true" ? (values.headline ?? "").toUpperCase() : (values.headline ?? "");
    const subText = (values.sub ?? "").trim().toUpperCase();
    const tracking = 0.16;

    // Measure the tracked line as it will be drawn, so wrapping and fitting are accurate.
    const measureSub: Measure = (text, size) => {
      ctx.font = font(800, size, WIDE_FONT);
      setTracking(ctx, size * tracking);
      const w = ctx.measureText(text).width;
      setTracking(ctx, 0);
      return w;
    };

    const gapH = 30 * g.u;
    const subReserve = subText ? Math.min(zone.height * 0.34, 210 * g.u) : 0;
    const sub = subText
      ? fitText(measureSub, subText, {
          maxWidth: g.cw,
          maxHeight: Math.max(0, subReserve - gapH),
          maxFont: (g.cls === "banner" ? 40 : 64) * g.u,
          minFont: 20 * g.u,
          lineHeight: 1.3,
        })
      : null;
    const subH = sub ? sub.height + gapH : 0;

    // Width of the visible ink, not the advance width, so the word can reach an edge exactly.
    const measureBrush: Measure = (text, size) => {
      ctx.font = font(400, size, BRUSH_FONT);
      setTracking(ctx, size * BRUSH_TRACKING);
      const m = ctx.measureText(text);
      setTracking(ctx, 0);
      return m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
    };
    // "Run to the edges": the word spans the whole canvas, bleed included, and overshoots a hair so it
    // is cropped by the edge like the Safety artwork. Fitting uses the visible ink, so letters reach the edge. Otherwise it stays inside the margins.
    const edge = values.edge === "true";
    const overshoot = edge ? a.width * 0.006 : 0;
    const boxW = edge ? a.width + overshoot * 2 : g.cw;
    const boxX = edge ? -overshoot : g.left;
    const boxH = Math.max(0, zone.height - subH);
    let headline = fitText(measureBrush, headlineText, {
      maxWidth: boxW,
      maxHeight: boxH,
      maxFont: edge ? boxH : (g.cls === "story" ? 520 : g.cls === "banner" ? 240 : 460) * g.u,
      minFont: 60 * g.u,
      lineHeight: 0.98,
    });
    if (edge && headline.height > 0) {
      // fitText steps down in whole percentages, so grow the word to reach the edges exactly.
      const widest = Math.max(...headline.lines.map((l) => measureBrush(l, headline.fontSize)));
      const grow = Math.min(widest > 0 ? boxW / widest : 1, boxH / headline.height);
      if (grow > 1) {
        headline = {
          ...headline,
          fontSize: headline.fontSize * grow,
          lineHeightPx: headline.lineHeightPx * grow,
          height: headline.height * grow,
        };
      }
    }

    const total = headline.height + subH;
    let y = zone.top + Math.max(0, (zone.height - total) / 2);

    drawBrushLines(a, headline.lines, boxX, y, headline.fontSize, headline.lineHeightPx);
    y += headline.height;

    if (sub) {
      y += gapH;
      // A light outline keeps the line readable over photos, as on the Safety artwork.
      const outline = theme.text === INK ? "#FFFFFF" : INK;
      ctx.save();
      ctx.font = font(800, sub.fontSize, WIDE_FONT);
      setTracking(ctx, sub.fontSize * tracking);
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.lineJoin = "round";
      ctx.lineWidth = sub.fontSize * 0.2;
      sub.lines.forEach((line, i) => {
        const ly = y + i * sub.lineHeightPx;
        ctx.strokeStyle = outline;
        ctx.strokeText(line, g.left, ly);
        ctx.fillStyle = theme.text;
        ctx.fillText(line, g.left, ly);
      });
      ctx.restore();
    }
  },
};

export const TEMPLATES: Template[] = [announcement, event, quote, brush];
export const DEFAULT_TEMPLATE_ID = "announcement";

export function getTemplate(id: string): Template {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export function defaultValues(template: Template): Values {
  return Object.fromEntries(template.fields.map((f) => [f.key, f.default]));
}
