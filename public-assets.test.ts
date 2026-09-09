import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Nothing in the build fails when a referenced asset stops existing: next/image
// and a plain href both accept a path that resolves to a 404, and the visitor
// finds out instead. The Donor Prospectus and the campaign PDFs are the ones
// that would hurt — a funder clicking through to nothing.
//
// This checks the literal paths. Assets assembled at runtime are covered
// separately below, where the data driving them can be read.

const SOURCE_DIRS = ["app", "components", "lib"];
const PUBLIC_DIR = "public";
// Everything served straight from public/ that source code links to by path.
const ASSET_PREFIXES = ["images", "pdfs", "favicon", "data"];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(path));
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(path);
  }
  return out;
}

/**
 * Absolute public paths appearing as quoted strings, e.g. "/images/x.jpg" or
 * the url('/pdfs/y.pdf') inside a style value.
 *
 * Quote-delimited rather than whitespace-delimited, which matters three ways:
 * several real filenames contain spaces ("Joseph-Miller (UK Director).jpg"),
 * prose in comments mentioning a path is not a reference, and `@/data/x.json`
 * is a build-time import from the repo root, not something served from public/.
 */
function referencedAssets(): { file: string; path: string }[] {
  const re = new RegExp(`(["'\`])(/(?:${ASSET_PREFIXES.join("|")})/[^"'\`]*)\\1`, "g");
  const found: { file: string; path: string }[] = [];

  for (const dir of SOURCE_DIRS) {
    for (const file of sourceFiles(dir)) {
      for (const match of readFileSync(file, "utf8").matchAll(re)) {
        // Strip a query string or fragment before hitting the filesystem.
        const path = match[2].split(/[?#]/)[0];
        // Assembled at runtime — the data behind these is checked separately.
        if (path.includes("${")) continue;
        // A trailing directory reference rather than a file.
        if (path.endsWith("/")) continue;
        found.push({ file, path });
      }
    }
  }
  return found;
}

function missing(assets: { file: string; path: string }[]): string[] {
  return assets
    .filter(({ path }) => !existsSync(join(PUBLIC_DIR, decodeURIComponent(path))))
    .map(({ file, path }) => `${file}: ${path}`);
}

describe("public assets", () => {
  it("every asset path in the source exists in public/", () => {
    const assets = referencedAssets();

    // Guards the scan: a regex matching nothing would make this pass forever.
    expect(assets.length, "found no asset references at all — the scan is broken").toBeGreaterThan(30);
    expect(missing(assets), "referenced files that do not exist in public/").toEqual([]);
  });

  it("every hero marquee photo exists", () => {
    // app/page.tsx builds these as `/images/front-page-hero-optimized/${src}`
    // from a list of bare filenames, so the literal scan above cannot see them.
    const source = readFileSync(join("app", "page.tsx"), "utf8");
    const block = source.match(/HERO_PHOTOS[\s\S]*?\n\];/);
    expect(block, "HERO_PHOTOS moved or was renamed — update this test").not.toBeNull();

    const files = [...block![0].matchAll(/\[\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(files.length, "no hero photos parsed out of HERO_PHOTOS").toBeGreaterThan(10);

    const absent = files.filter(
      (name) => !existsSync(join(PUBLIC_DIR, "images", "front-page-hero-optimized", name)),
    );
    expect(absent, "hero photos listed in app/page.tsx but missing from public/").toEqual([]);
  });

  it("every chapter and person image exists", () => {
    // These come from data modules as whole paths, so the literal scan does
    // cover them — this asserts the data is actually being read, so a future
    // move to a CMS or a dynamic path does not silently drop the coverage.
    const fromData = referencedAssets().filter(({ file }) => file.startsWith(join("lib", "data")));

    expect(fromData.length, "no asset paths found in lib/data — did the data move?").toBeGreaterThan(5);
    expect(missing(fromData)).toEqual([]);
  });
});
