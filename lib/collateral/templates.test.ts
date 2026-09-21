import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { defaultValues, FONT_LOADS, TEMPLATES } from "./templates";

const root = process.cwd();
const css = readFileSync(join(root, "app/tools/collateral/collateral.css"), "utf8");

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
  it.each(FONT_LOADS)("%s is declared in collateral.css", (load) => {
    const family = /"([^"]+)"/.exec(load)![1];
    expect(css).toContain(`font-family: "${family}"`);
  });

  it("only points at font files that exist in public/", () => {
    const files = [...css.matchAll(/url\("(\/fonts\/[^"]+)"\)/g)].map((m) => m[1]);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) expect(existsSync(join(root, "public", file)), file).toBe(true);
  });
});
