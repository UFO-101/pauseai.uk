import { existsSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { CANVAS_FONTS } from "./canvasFonts";
import { CAPTION_FONTS } from "./qrCaption";
import { defaultValues, FONT_LOADS, TEMPLATES } from "./templates";

const root = process.cwd();

describe.each(TEMPLATES)("template $id", (template) => {
  it("has unique field keys", () => {
    const keys = template.fields.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("has defaults that fit their own length limits", () => {
    for (const field of template.fields) {
      if (field.maxLength) expect(field.default.length, field.key).toBeLessThanOrEqual(field.maxLength);
    }
  });

  it("uses true/false strings for toggles", () => {
    for (const field of template.fields.filter((f) => f.kind === "toggle")) {
      expect(["true", "false"], field.key).toContain(field.default);
    }
  });

  it("gives every field a default value", () => {
    expect(Object.keys(defaultValues(template)).sort()).toEqual(template.fields.map((f) => f.key).sort());
  });
});

describe("template ids", () => {
  it("are unique", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("canvas fonts", () => {
  // Canvas text silently falls back to a system font if a face is not declared or its file is missing.
  it.each(FONT_LOADS)("%s is a canvas font", (load) => {
    const family = /"([^"]+)"/.exec(load)![1];
    expect(CANVAS_FONTS.map((f) => f.family)).toContain(family);
  });

  it("gives the QR caption the canvas fonts' families and files", () => {
    for (const { family, file } of Object.values(CAPTION_FONTS)) {
      expect(CANVAS_FONTS).toContainEqual(expect.objectContaining({ family, file }));
    }
  });

  it("only points at font files that exist in public/", () => {
    for (const { file } of CANVAS_FONTS) expect(existsSync(join(root, "public", file)), file).toBe(true);
  });
});
