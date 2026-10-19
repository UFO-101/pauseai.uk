import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// The component gallery (app/(tools)/gallery)
// shows every component, so the storyboard pictures each one. This fails on
// an exported component that has no example there: a new one isn't done
// until it's in the gallery. Which variants each needs is judged in review.
const ROOT = join(__dirname, "..", "..");
const GALLERY = join(ROOT, "app", "(tools)", "gallery");
const EXAMPLES = join(GALLERY, "_examples");

/** Every .tsx under dir, tests left out. */
function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(path);
    return entry.name.endsWith(".tsx") && !entry.name.includes(".test.") ? [path] : [];
  });
}

/** The components' files: all of components/, and every _components folder in app/ but the gallery's own. */
function componentFiles(): string[] {
  const inApp = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      if (!entry.isDirectory()) return [];
      const path = join(dir, entry.name);
      if (path === GALLERY) return [];
      return entry.name === "_components" ? tsxFiles(path) : inApp(path);
    });
  return [...tsxFiles(join(ROOT, "components")), ...inApp(join(ROOT, "app"))];
}

/**
 * A file's exported components: its exported functions and consts named in
 * PascalCase. A constant in capitals (TOOLS, APPLY_URL) isn't one.
 */
function exportedComponents(source: string): string[] {
  const names = [...source.matchAll(/^export (?:default )?(?:async )?function ([A-Z]\w*)/gm)].map((m) => m[1]);
  names.push(...[...source.matchAll(/^export const ([A-Z]\w*)\s*[:=]/gm)].map((m) => m[1]));
  return names.filter((name) => /[a-z]/.test(name));
}

describe("component gallery", () => {
  const examples = tsxFiles(EXAMPLES)
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
  const has = (name: string, file: string) =>
    new RegExp(`name: "${name}",\\s*file: "${file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(examples);

  it("has an example of every exported component", () => {
    const missing = componentFiles().flatMap((path) => {
      const file = relative(ROOT, path);
      return exportedComponents(readFileSync(path, "utf8"))
        .filter((name) => !has(name, file))
        .map((name) => `${name} (${file})`);
    });
    expect(missing).toEqual([]);
  });

  it("finds components exported as functions and as consts, default or not", () => {
    expect(
      exportedComponents(
        [
          "export default function Card() {}",
          "export function Row() {}",
          "export async function Loader() {}",
          "export const Context = createContext(null);",
          "export function helper() {}",
          "export const LIMIT = 3;",
        ].join("\n"),
      ),
    ).toEqual(["Card", "Row", "Loader", "Context"]);
  });
});
