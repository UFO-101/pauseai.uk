import { beforeAll, describe, expect, it } from "vitest";
import "@/app/(tools)/tools/collateral/collateral.css";
import { FORMATS, getFormat } from "./formats";
import { LIBRARY_PHOTOS } from "./photos";
import { loadFonts, loadImage, renderCollateral, type RenderOptions } from "./render";
import { defaultValues, getTemplate, TEMPLATES, type Drawable } from "./templates";
import { CLEAR_PHOTO_LOGO_SRC, THEMES, getTheme } from "./themes";

// Draws every layout into a real canvas: at every format, in every style,
// with and without a photo, QR codes and partner logos, and with lint on, so
// the checks run too. The pixels themselves are compared against stored
// images in plans/visual-baselines.md; these tests check what each drawing
// reports and that it actually painted something.

let logos: Record<string, Drawable>;
let photo: Drawable;
let clearLogo: Drawable;
let partner: Drawable;

beforeAll(async () => {
  await loadFonts();
  logos = Object.fromEntries(await Promise.all(THEMES.map(async (t) => [t.id, await loadImage(t.logoSrc)] as const)));
  clearLogo = await loadImage(CLEAR_PHOTO_LOGO_SRC);
  photo = await loadImage(LIBRARY_PHOTOS[0].src);
  // A wide partner logo, drawn on a canvas.
  const c = document.createElement("canvas");
  c.width = 400;
  c.height = 100;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#123456";
  ctx.fillRect(0, 0, 400, 100);
  partner = { source: c, width: 400, height: 100 };
});

function options(templateId: string, formatId: string, themeId: string, extra: Partial<RenderOptions> = {}): RenderOptions {
  const template = getTemplate(templateId);
  const theme = getTheme(themeId);
  return {
    format: getFormat(formatId),
    template,
    theme,
    // The caption layout's default is empty, so give it something to draw.
    values: { ...defaultValues(template), ...(templateId === "caption" ? { caption: "Volunteers outside Parliament" } : {}) },
    logo: logos[theme.id],
    photo: null,
    photoSettings: { zoom: 1, focalX: 0.5, focalY: 0.5 },
    qrCodes: [],
    trackQr: false,
    maxSide: 360,
    lint: true,
    ...extra,
  };
}

/** Whether the canvas has more than one colour on it. */
function painted(canvas: HTMLCanvasElement): boolean {
  const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 4; i < data.length; i += 4 * 37) {
    if (data[i] !== data[0] || data[i + 1] !== data[1] || data[i + 2] !== data[2]) return true;
  }
  return false;
}

const QR = [
  { label: "Join", url: "pauseai.uk/join" },
  { label: "Events", url: "pauseai.uk/events" },
  { label: "", url: "lu.ma/eoohwufh" },
];

describe.each(TEMPLATES.map((t) => t.id))("layout %s", (templateId) => {
  it.each(FORMATS.map((f) => f.id))("draws at %s in every style, with and without a photo and QR codes", (formatId) => {
    for (const theme of THEMES) {
      for (const withPhoto of [false, true]) {
        const canvas = document.createElement("canvas");
        const out = renderCollateral(
          canvas,
          options(templateId, formatId, theme.id, {
            photo: withPhoto ? photo : null,
            qrCodes: withPhoto ? QR : QR.slice(0, 1),
            screenQr: withPhoto,
            partnerLogos: withPhoto ? [partner, partner] : [],
            clearPhotoLogo: clearLogo,
          }),
        );
        expect(Math.max(out.width, out.height)).toBe(360);
        expect(painted(canvas), `${templateId} ${formatId} ${theme.id}`).toBe(true);
        for (const issue of out.issues) expect(issue.message.length).toBeGreaterThan(0);
      }
    }
  });
});
