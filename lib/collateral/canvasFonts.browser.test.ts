import { describe, expect, it } from "vitest";
import { CANVAS_FONTS, declareCanvasFonts } from "./canvasFonts";

/** A face's family, without the quotes Chromium gives a name with spaces. */
const family = (face: FontFace) => face.family.replace(/"/g, "");
const canvasFaces = () => [...document.fonts].filter((face) => family(face).startsWith("PAI "));

describe("declareCanvasFonts", () => {
  it("adds each canvas face to the page once, held back until it loads", async () => {
    expect(canvasFaces()).toEqual([]);
    declareCanvasFonts();
    declareCanvasFonts();
    expect(canvasFaces().map((face) => [family(face), face.weight, face.display])).toEqual(
      CANVAS_FONTS.map(({ family, weight }) => [family, weight, "block"]),
    );
    await document.fonts.load('500 40px "PAI Inter"');
    expect(canvasFaces().find((face) => family(face) === "PAI Inter")!.status).toBe("loaded");
  });
});
