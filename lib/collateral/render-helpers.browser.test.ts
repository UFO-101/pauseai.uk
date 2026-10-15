import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import "@/app/(tools)/tools/collateral/collateral.css";
import { getFormat } from "./formats";
import { LIBRARY_PHOTOS } from "./photos";
import {
  autoPhotoVisible,
  drawableToJpegDataUrl,
  drawableToPngDataUrl,
  fileToDrawable,
  loadDataUrl,
  loadFonts,
  loadImage,
  renderCollateral,
  type RenderOptions,
} from "./render";
import { PHOTO_TINTS } from "./design";
import { defaultValues, getTemplate, type Drawable } from "./templates";
import { getTheme } from "./themes";

let logo: Drawable;
let photo: Drawable;

beforeAll(async () => {
  await loadFonts();
  logo = await loadImage(getTheme("cream").logoSrc);
  photo = await loadImage(LIBRARY_PHOTOS[0].src);
});

afterEach(() => vi.restoreAllMocks());

const picture = (w: number, h: number, colour = "#336699"): Drawable => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, w, h);
  return { source: c, width: w, height: h };
};

function opts(extra: Partial<RenderOptions> = {}): RenderOptions {
  const template = getTemplate("announcement");
  return {
    format: getFormat("ig-square"),
    template,
    theme: getTheme("cream"),
    values: defaultValues(template),
    logo,
    photo: null,
    photoSettings: { zoom: 1, focalX: 0.5, focalY: 0.5 },
    qrCodes: [],
    trackQr: false,
    ...extra,
  };
}

describe("loading images", () => {
  it("caches same-origin images, and reports one that fails", async () => {
    const src = getTheme("orange").logoSrc;
    expect(loadImage(src)).toBe(loadImage(src));
    await expect(loadImage("/images/no-such-file.png")).rejects.toThrow("Could not load the image");
  });

  it("decodes a photo embedded as a data URL", async () => {
    const dataUrl =
      picture(30, 20).source instanceof HTMLCanvasElement
        ? (picture(30, 20).source as HTMLCanvasElement).toDataURL()
        : "";
    const drawable = await loadDataUrl(dataUrl);
    expect([drawable.width, drawable.height]).toEqual([30, 20]);
  });

  it("reads an uploaded file", async () => {
    const blob = await new Promise<Blob>((r) =>
      (picture(12, 8).source as HTMLCanvasElement).toBlob((b) => r(b!), "image/png"),
    );
    const drawable = await fileToDrawable(new File([blob], "upload.png", { type: "image/png" }));
    expect([drawable.width, drawable.height]).toEqual([12, 8]);
  });
});

describe("encoding images for saved projects", () => {
  it("shrinks a photo to a JPEG no larger than the limit", async () => {
    const url = drawableToJpegDataUrl(picture(3000, 1500));
    expect(url.startsWith("data:image/jpeg")).toBe(true);
    const back = await loadDataUrl(url);
    expect([back.width, back.height]).toEqual([2400, 1200]);
    const small = await loadDataUrl(drawableToJpegDataUrl(picture(100, 50), 40, 0.5));
    expect([small.width, small.height]).toEqual([40, 20]);
  });

  it("keeps a partner logo as a PNG no larger than the limit", async () => {
    const back = await loadDataUrl(drawableToPngDataUrl(picture(1200, 300)));
    expect([back.width, back.height]).toEqual([600, 150]);
    const tiny = await loadDataUrl(drawableToPngDataUrl(picture(100, 100), 10));
    expect([tiny.width, tiny.height]).toEqual([10, 10]);
  });

  it("fails clearly where canvas is not supported", () => {
    const image = picture(10, 10);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(() => drawableToJpegDataUrl(image)).toThrow("Canvas is not supported");
    expect(() => drawableToPngDataUrl(image)).toThrow("Canvas is not supported");
    expect(() => renderCollateral(document.createElement("canvas"), opts())).toThrow("Canvas is not supported");
  });
});

describe("choosing the colour over the photo", () => {
  const steps = PHOTO_TINTS.map((t) => t.visible);

  it("uses the lightest step without a photo", () => {
    expect(autoPhotoVisible(opts())).toBe(steps[0]);
  });

  it("picks the lightest step the text reads on", () => {
    expect(steps).toContain(autoPhotoVisible(opts({ photo })));
    expect(autoPhotoVisible(opts({ photo: picture(400, 400, "#fdf8f3") }))).toBe(steps[0]);
  });

  it("falls back to the strongest step when nothing reads", () => {
    // Cream text on a cream photo can't read at any step.
    const theme = { ...getTheme("cream"), text: "#fdf8f3", accentText: "#fdf8f3" };
    expect(autoPhotoVisible(opts({ photo: picture(400, 400, "#fdf8f3"), theme, maxSide: 300 }))).toBe(
      steps[steps.length - 1],
    );
  });

  it("uses a step that reads even if the photo behind it is busy", () => {
    const stripes = document.createElement("canvas");
    stripes.width = 400;
    stripes.height = 400;
    const ctx = stripes.getContext("2d")!;
    for (let x = 0; x < 400; x += 2) {
      ctx.fillStyle = x % 4 ? "#000" : "#fff";
      ctx.fillRect(x, 0, 2, 400);
    }
    expect(steps).toContain(autoPhotoVisible(opts({ photo: { source: stripes, width: 400, height: 400 } })));
  });
});
