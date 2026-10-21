import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Every field on the site is the ui kit's (components/ui/Controls.tsx), so it
// has the site's look, focus ring and density (docs/style-guide.md, "Forms").
// This fails on an <input>, <select> or <textarea> written anywhere else in
// app/ or components/, so a form can't have fields of its own. A
// hidden input carries a value (type="hidden"), and a hidden file picker is
// opened by a button (`hidden`): neither is seen, so both are fine anywhere.
const ROOT = join(__dirname, "..", "..");

// The controls that aren't the kit's, and why.
const OWN_CONTROLS: Record<string, string> = {
  "components/ui/Controls.tsx": "the kit's controls themselves",
  "app/(tools)/tools/collateral/_components/Slider.tsx": "a range slider, the one control the kit hasn't",
  "components/tools/kit/Choices.tsx": "a choice card, with its checkbox in its corner",
  "app/(site)/campaigns/_components/LetterForm.tsx": "the honeypot field, hidden from people for bots to fill",
  "app/(site)/global-ai-sentiment-2026/_components/CountryExplorer.tsx":
    "the report's own controls, styled as a set with its bespoke dropdown",
  "app/(site)/global-ai-sentiment-2026/_components/DemographicsExplorer.tsx":
    "the report's own controls, styled as a set with its bespoke dropdown",
};

/** Every .tsx under dir, tests left out. */
function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(path);
    return entry.name.endsWith(".tsx") && !entry.name.includes(".test.") ? [path] : [];
  });
}

/** The JSX tag starting at `start` ("<input ... />"), to its end, past any braces inside it. */
function tagAt(source: string, start: number): string {
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") depth--;
    else if (source[i] === ">" && depth === 0) return source.slice(start, i + 1);
  }
  return source.slice(start);
}

/** The form controls written in `source` that aren't hidden: "<select name=…>", one line each. */
function ownControls(source: string): string[] {
  return [...source.matchAll(/<(input|select|textarea)\b/g)]
    .map((match) => tagAt(source, match.index))
    .filter((tag) => !/\btype="hidden"/.test(tag) && !/\shidden[\s/>]/.test(tag))
    .map((tag) => tag.replace(/\s+/g, " "));
}

describe("form controls", () => {
  it("are the ui kit's, everywhere but the files listed", () => {
    const found = [...tsxFiles(join(ROOT, "app")), ...tsxFiles(join(ROOT, "components"))].flatMap((path) => {
      const file = relative(ROOT, path);
      if (file in OWN_CONTROLS) return [];
      return ownControls(readFileSync(path, "utf8")).map((tag) => `${file}: ${tag}`);
    });
    expect(found).toEqual([]);
  });

  it("lists only files that still have controls of their own", () => {
    const stale = Object.keys(OWN_CONTROLS).filter(
      (file) => ownControls(readFileSync(join(ROOT, file), "utf8")).length === 0,
    );
    expect(stale).toEqual([]);
  });

  it("finds inputs, selects and text areas, but not hidden ones", () => {
    const source = [
      '<input name="a" onChange={(e) => set(e.target.value)} />',
      '<select name="b">',
      "<textarea\n  rows={3}\n/>",
      '<input type="hidden" name="id" value={id} />',
      '<input ref={ref} type="file" hidden onChange={pick} />',
      '<TextInput name="c" />',
    ].join("\n");
    expect(ownControls(source)).toEqual([
      '<input name="a" onChange={(e) => set(e.target.value)} />',
      '<select name="b">',
      "<textarea rows={3} />",
    ]);
  });
});
