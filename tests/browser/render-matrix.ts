// Draws one collateral layout into a real canvas, at every format, in every
// style, with and without a photo, QR codes and partner logos, and with lint
// on, so the checks run too. These tests check what each drawing reports
// and that it actually painted something, not its pixels.
//
// One test file per layout (lib/collateral/render-*.browser.test.ts) calls
// this, rather than one file for all of them: the files run in parallel, and
// with coverage on, the drawing is several times slower, so the one file was
// the whole browser project's critical path.
import { beforeAll, describe, expect, it } from "vitest";
// The studio declares the fonts the canvas draws with.
import "@/app/(tools)/tools/collateral/_components/kit/Studio";
import { FORMATS, getFormat } from "@/lib/collateral/formats";
import { LIBRARY_PHOTOS } from "@/lib/collateral/photos";
import { loadFonts, loadImage, renderCollateral, type RenderOptions } from "@/lib/collateral/render";
import { defaultValues, getTemplate, type Drawable } from "@/lib/collateral/templates";
import { CLEAR_PHOTO_LOGO_SRC, THEMES, getTheme } from "@/lib/collateral/themes";

let logos: Record<string, Drawable>;
let photo: Drawable;
let clearLogo: Drawable;
let partner: Drawable;

async function loadAssets() {
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
}

function options(
  templateId: string,
  formatId: string,
  themeId: string,
  extra: Partial<RenderOptions> = {},
): RenderOptions {
  const template = getTemplate(templateId);
  const theme = getTheme(themeId);
  return {
    format: getFormat(formatId),
    template,
    theme,
    // The caption layout's default is empty, so give it something to draw.
    values: {
      ...defaultValues(template),
      ...(templateId === "caption" ? { caption: "Volunteers outside Parliament" } : {}),
    },
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

/** The tests for one layout: a drawing at every format, in every style, with and without the extras. */
export function describeRenderMatrix(templateId: string): void {
  describe(`layout ${templateId}`, () => {
    beforeAll(loadAssets);

    it.each(FORMATS.map((f) => f.id))(
      "draws at %s in every style, with and without a photo and QR codes",
      (formatId) => {
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
      },
    );
  });
}
