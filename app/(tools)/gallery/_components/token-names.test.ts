import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COLOUR_TOKENS, DENSITY_TOKENS, RADIUS_TOKENS, SPACE_TOKENS, TEXT_TOKENS } from "./token-names";

const CSS = readFileSync(join(__dirname, "..", "..", "..", "..", "styles", "tokens.css"), "utf8");

/** The custom properties a block of tokens.css defines, in order. */
const defined = (block: string) => [...block.matchAll(/^\s*(--[\w-]+):/gm)].map((m) => m[1]);

const root = defined(CSS.slice(CSS.indexOf(":root {"), CSS.indexOf("}", CSS.indexOf(":root {"))));
const compact = CSS.slice(CSS.indexOf('[data-density="compact"] {'));

describe("the gallery's tokens", () => {
  it("are every token tokens.css defines, each listed once", () => {
    const listed = [...COLOUR_TOKENS, ...SPACE_TOKENS, ...TEXT_TOKENS, ...RADIUS_TOKENS, ...DENSITY_TOKENS];
    const others = ["--measure-page", "--measure-wide", "--focus-ring", "--focus-offset"];
    const colourChannels = root.filter((name) => name.endsWith("-rgb"));
    expect([...listed, ...others, ...colourChannels].sort()).toEqual([...root].sort());
  });

  it("list every token the compact density changes", () => {
    expect([...new Set(defined(compact))].sort()).toEqual([...DENSITY_TOKENS].sort());
  });
});
