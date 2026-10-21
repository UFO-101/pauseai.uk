import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
// The studio declares the fonts the canvas draws with.
import "@/components/tools/kit/Studio";
import { getFormat } from "./formats";
import type { LintIssue } from "./lint";
import { LIBRARY_PHOTOS } from "./photos";
import { loadFonts, loadImage, renderCollateral, type RenderOptions } from "./render";
import { defaultValues, getTemplate, logoCoverRect, TEMPLATES, type Drawable, type Values } from "./templates";
import { CLEAR_PHOTO_LOGO_SRC, getTheme } from "./themes";

// Specific situations each layout has to handle, checked through what the
// drawing reports to the checks list.

let logo: Drawable;
let clearLogo: Drawable;
let photo: Drawable;

const wide = (w: number, h: number): Drawable => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.fillRect(0, 0, w, h);
  return { source: c, width: w, height: h };
};

beforeAll(async () => {
  await loadFonts();
  logo = await loadImage(getTheme("cream").logoSrc);
  clearLogo = await loadImage(CLEAR_PHOTO_LOGO_SRC);
  photo = await loadImage(LIBRARY_PHOTOS[0].src);
});

afterEach(() => vi.restoreAllMocks());

function draw(templateId: string, formatId: string, values: Values = {}, extra: Partial<RenderOptions> = {}) {
  const template = getTemplate(templateId);
  const canvas = document.createElement("canvas");
  const out = renderCollateral(canvas, {
    format: getFormat(formatId),
    template,
    theme: getTheme("cream"),
    values: { ...defaultValues(template), ...values },
    logo,
    photo: null,
    photoSettings: { zoom: 1, focalX: 0.5, focalY: 0.5 },
    qrCodes: [],
    trackQr: false,
    maxSide: 400,
    lint: true,
    ...extra,
  });
  return { ...out, canvas, ids: out.issues.map((i: LintIssue) => i.id) };
}

describe("every layout copes with missing values", () => {
  it.each(TEMPLATES.map((t) => t.id))("%s", (templateId) => {
    for (const formatId of ["ig-square", "x-header", "a5"]) {
      const template = getTemplate(templateId);
      const canvas = document.createElement("canvas");
      const out = renderCollateral(canvas, {
        format: getFormat(formatId),
        template,
        theme: getTheme("orange"),
        values: {},
        logo,
        photo: null,
        photoSettings: { zoom: 1, focalX: 0.5, focalY: 0.5, visible: 0.5 },
        qrCodes: [],
        trackQr: false,
        maxSide: 300,
        lint: true,
      });
      expect(out.width).toBeGreaterThan(0);
    }
  });
});

describe("titles", () => {
  it("warns when the text cannot fit, and notes when it had to shrink a lot", () => {
    const long = "An extremely long headline that goes on and on and on and on about safety";
    expect(
      draw("announcement", "x-header", { headline: long.repeat(6), sub: long.repeat(2) }, { headlineScale: 1.3 }).ids,
    ).toContain("text-overflow");
    // Somewhere between fitting comfortably and not fitting, the title shrinks a lot.
    const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
    const lengths = Array.from({ length: 40 }, (_, i) => 4 + i * 3);
    expect(
      lengths.some((n) =>
        draw("announcement", "ig-square", { headline: words(n), kicker: "", sub: "" }).ids.includes("title-small"),
      ),
    ).toBe(true);
    expect(draw("quote", "x-header", { quote: long.repeat(30) }).ids).toContain("text-overflow");
  });

  it("is happy with a short title", () => {
    expect(draw("announcement", "ig-square", { headline: "Pause" }).ids).toEqual([]);
  });
});

describe("the event layout", () => {
  it("drops the description, then shrinks the details, to fit the title", () => {
    const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
    const dropped = Array.from({ length: 30 }, (_, i) => 2 + i * 2).some((n) =>
      draw("event", "ig-square", {
        headline: words(n),
        blurb: "A short description of the event",
        end: "21:00",
      }).ids.includes("blurb-dropped"),
    );
    expect(dropped).toBe(true);
  });

  it("shows a time range, and the time alone without a date", () => {
    expect(draw("event", "ig-portrait", { end: "21:30" }).ids).not.toContain("text-overflow");
    expect(draw("event", "ig-portrait", { date: "", venue: "", blurb: "", kicker: "" }).ids).not.toContain(
      "text-overflow",
    );
  });

  it("shows the venue alone when there is no date or time", () => {
    expect(draw("event", "ig-portrait", { date: "", start: "", end: "", venue: "Somewhere" }).ids).not.toContain(
      "text-overflow",
    );
  });

  it("puts the time on its own line when date and time don't fit on one", () => {
    expect(
      draw("event", "a6", { date: "2030-09-28", start: "19:00", end: "21:30" }, { maxSide: 400 }).width,
    ).toBeGreaterThan(0);
  });
});

describe("the quote layout", () => {
  it("draws with only a name, only a role, or neither", () => {
    for (const values of [{ role: "" }, { name: "" }, { name: "", role: "" }] as Values[]) {
      expect(draw("quote", "story", values).ids).not.toContain("text-overflow");
    }
  });
});

describe("the brush layout", () => {
  it("draws inside the margins or to the edges, in either case, with or without a line beneath", () => {
    for (const values of [
      { uppercase: "false", edge: "false" },
      { uppercase: "true", edge: "true", sub: "" },
      { headline: "", sub: "" },
    ] as Values[]) {
      for (const themeId of ["cream", "black"]) {
        const template = getTemplate("brush");
        const canvas = document.createElement("canvas");
        renderCollateral(canvas, {
          format: getFormat("ig-square"),
          template,
          theme: getTheme(themeId),
          values: { ...defaultValues(template), ...values },
          logo,
          photo: null,
          photoSettings: { zoom: 1, focalX: 0.5, focalY: 0.5, visible: 0.5 },
          qrCodes: [],
          trackQr: false,
          maxSide: 300,
        });
        expect(canvas.width).toBe(300);
      }
    }
  });
});

describe("the caption layout", () => {
  it("draws only the photo when there is no caption", () => {
    const out = draw("caption", "ig-square", { caption: "  " }, { photo });
    expect(out.issues).toEqual([]);
  });
});

describe("the header", () => {
  it("adds the local group to the UK label", () => {
    expect(draw("announcement", "ig-square", { group: "London" }).width).toBe(400);
  });

  it("shrinks partner logos to fit, then leaves out the ones that don't", () => {
    expect(draw("announcement", "ig-square", {}, { partnerLogos: [wide(400, 100)] }).ids).not.toContain(
      "partner-logo-dropped",
    );
    const many = Array.from({ length: 4 }, () => wide(400, 100));
    const some = draw("announcement", "ig-square", { group: "" }, { partnerLogos: many });
    expect(some.issues.find((i) => i.id === "partner-logo-dropped")?.message).toMatch(/Not every partner logo fits/);
    // A long local group label leaves no room on a square.
    const none = draw("announcement", "ig-square", { group: "West of England" }, { partnerLogos: [wide(4000, 100)] });
    expect(none.issues.find((i) => i.id === "partner-logo-dropped")?.message).toMatch(/The partner logo does not fit/);
  });
});

describe("the footer and QR codes", () => {
  const codes = (n: number, labels = true) =>
    Array.from({ length: n }, (_, i) => ({
      label: labels ? `Code ${i + 1} with a long label` : "",
      url: `pauseai.uk/page-${i + 1}`,
    }));

  it("puts codes beside the text when they fit, and on their own row when they don't", () => {
    expect(draw("announcement", "a4", {}, { qrCodes: codes(1) }).ids).toContain("qr-mismatch");
    expect(
      draw(
        "announcement",
        "a4",
        { cta: "A rather long call to action", url: "pauseai.uk/a-very-long-address-indeed" },
        { qrCodes: codes(3) },
      ).width,
    ).toBeGreaterThan(0);
    expect(draw("announcement", "a5", { cta: "" }, { qrCodes: codes(2, false), qrSize: "l" }).width).toBeGreaterThan(0);
  });

  it("flags two codes opening the same address", () => {
    const same = [
      { label: "A", url: "pauseai.uk/join" },
      { label: "B", url: "https://pauseai.uk/join/" },
    ];
    expect(draw("announcement", "a5", {}, { qrCodes: same }).ids).toContain("qr-duplicate");
  });

  it("doesn't flag the events page being printed while a code opens one event", () => {
    const out = draw(
      "event",
      "a5",
      { url: "pauseai.uk/events" },
      { qrCodes: [{ label: "RSVP", url: "lu.ma/eoohwufh" }] },
    );
    expect(out.ids).not.toContain("qr-mismatch");
  });

  it("explains when codes can't be shown on a format", () => {
    const out = draw("announcement", "link-share", {}, { qrCodes: codes(3), screenQr: true, trackQr: true });
    expect(out.ids).toContain("qr-plan");
  });

  it("stacks the address under a long call to action, and squeezes an address that is still too long", () => {
    const longUrl = "pauseai.uk/an-address-that-is-much-too-long-to-print-nicely";
    expect(draw("announcement", "x-header", { cta: "Join the movement today", url: longUrl }).width).toBe(400);
    expect(
      draw("announcement", "ig-square", { cta: "", url: longUrl }, { photo, qrCodes: codes(1), screenQr: true }).width,
    ).toBe(400);
  });

  it("leaves the footer out when there is nothing to put in it", () => {
    expect(draw("announcement", "ig-square", { cta: "", url: "" }).width).toBe(400);
  });
});

describe("photos", () => {
  it("can show the photo untinted", () => {
    expect(
      draw("announcement", "ig-square", {}, { photo, photoSettings: { zoom: 1, focalX: 0.5, focalY: 0.5, visible: 1 } })
        .width,
    ).toBe(400);
  });

  it("checks contrast against a style colour it can't read as white", () => {
    const theme = { ...getTheme("cream"), bg: "white" };
    expect(draw("announcement", "ig-square", {}, { photo, theme }).width).toBe(400);
  });

  it("measures text even if the browser reports a font size it can't parse", () => {
    const font = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, "font")!;
    vi.spyOn(CanvasRenderingContext2D.prototype, "font", "get").mockReturnValue("bold serif");
    vi.spyOn(CanvasRenderingContext2D.prototype, "font", "set").mockImplementation(function (
      this: CanvasRenderingContext2D,
      v: string,
    ) {
      font.set!.call(this, v);
    });
    expect(draw("announcement", "ig-square", {}, { photo }).width).toBe(400);
  });
});

describe("the Luma logo cover", () => {
  it("shows the photo untinted with a light logo, and the title when asked", () => {
    const long = draw(
      "announcement",
      "luma-cover",
      { headline: "A title much longer than twenty characters" },
      { photo, photoClear: true, coverTitle: true, clearPhotoLogo: clearLogo },
    );
    expect(long.ids).toContain("cover-title-long");
    const short = draw(
      "announcement",
      "luma-cover",
      { headline: "Short" },
      { photo, photoClear: true, coverTitle: true },
    );
    expect(short.ids).not.toContain("cover-title-long");
  });

  it("tints the photo and uses the style's colours otherwise", () => {
    expect(draw("announcement", "luma-cover", { headline: "Tinted" }, { photo, coverTitle: true }).width).toBe(400);
    expect(draw("announcement", "luma-cover", { headline: "  " }, { coverTitle: true, photoClear: true }).width).toBe(
      400,
    );
    expect(
      draw("announcement", "luma-cover", {}, { coverTitle: true, values: {} } as Partial<RenderOptions>).width,
    ).toBe(400);
  });

  it("puts the logo bottom-left", () => {
    const r = logoCoverRect(1000, 1000);
    expect(r.x).toBeGreaterThan(0);
    expect(r.y + r.h).toBeLessThan(1000);
    expect(r.w).toBe(500);
  });
});

describe("less common combinations", () => {
  const codes = [
    { label: "Join", url: "pauseai.uk/join" },
    { label: "Events", url: "pauseai.uk/events" },
    { label: "People", url: "pauseai.uk/people" },
  ];

  it("draws QR codes without collecting checks", () => {
    expect(draw("announcement", "a5", {}, { qrCodes: codes, lint: false }).issues).toEqual([]);
  });

  it("draws QR codes with no web address and no call to action", () => {
    const out = draw("announcement", "a4", { cta: "", url: "" }, { qrCodes: codes });
    expect(out.ids).not.toContain("qr-mismatch");
  });

  it("draws a brush word inside the margins on a tall format, and copes with no word", () => {
    expect(draw("brush", "story", { edge: "false" }).width).toBeGreaterThan(0);
    const template = getTemplate("brush");
    const canvas = document.createElement("canvas");
    renderCollateral(canvas, {
      format: getFormat("ig-square"),
      template,
      theme: getTheme("cream"),
      values: { uppercase: "true", edge: "true" },
      logo,
      photo: null,
      photoSettings: { zoom: 1, focalX: 0.5, focalY: 0.5, visible: 0.5 },
      qrCodes: [],
      trackQr: false,
      maxSide: 300,
    });
    expect(canvas.width).toBe(300);
  });
});
