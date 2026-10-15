import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

// Every staff page, route handler and Server Action file under app/(staff)/
// must call requireStaff(). proxy.ts only checks that a cookie exists; this
// is what makes every staff entry point check the session in the database
// (plans/email-your-mp-v2.md, "Staff interface").
//
// Components (_components/) and the layout only render what a page hands
// them, so they're not entry points. The login page and the two login
// routes (asking for a link, and where it goes) are how staff get a session,
// so they can't require one.
const ROOT = "app/(staff)";
const OPEN = new Set(["staff/login/page.tsx", "staff/api/login/route.ts", "staff/api/callback/route.ts"]);

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name.startsWith("_") ? [] : files(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

function entryPoints(root: string) {
  return files(root)
    .map((path) => ({ path, name: relative(root, path).split("\\").join("/"), source: readFileSync(path, "utf8") }))
    .filter(({ name, source }) => /(^|\/)(page|route)\.tsx?$/.test(name) || /^\s*["']use server["']/m.test(source));
}

function unprotected(root: string) {
  return entryPoints(root)
    .filter(({ name, source }) => !OPEN.has(name) && !/\brequireStaff\(\)/.test(source))
    .map(({ name }) => name);
}

describe("staff auth", () => {
  it("every staff page, route and Server Action calls requireStaff()", () => {
    expect(unprotected(ROOT)).toEqual([]);
    expect(entryPoints(ROOT).length).toBeGreaterThan(OPEN.size);
  });

  describe("on a made-up staff interface", () => {
    let dir: string;

    function tree(sources: Record<string, string>) {
      dir = mkdtempSync(join(tmpdir(), "staff-auth-"));
      for (const [path, source] of Object.entries(sources)) {
        mkdirSync(dirname(join(dir, path)), { recursive: true });
        writeFileSync(join(dir, path), source);
      }
      return dir;
    }

    afterEach(() => rmSync(dir, { recursive: true, force: true }));

    it("passes pages, routes and Server Actions that call it, and skips the rest", () => {
      const root = tree({
        "staff/page.tsx": "await requireStaff();",
        "staff/api/thing/route.ts": "await requireStaff();",
        "staff/actions.ts": '"use server";\nawait requireStaff();',
        "staff/login/page.tsx": "open",
        "staff/api/login/route.ts": "open",
        "staff/api/callback/route.ts": "open",
        "staff/_components/Table.tsx": "a component",
        "staff/page.test.tsx": "a test",
        "layout.tsx": "a layout",
      });
      expect(unprotected(root)).toEqual([]);
      expect(entryPoints(root)).toHaveLength(6);
    });

    it("finds a page, route or Server Action that doesn't", () => {
      const root = tree({
        "staff/x/page.tsx": "requireStaff",
        "staff/api/y/route.ts": "",
        "staff/more.ts": "'use server'\nexport async function f() {}",
      });
      expect(unprotected(root).sort()).toEqual(["staff/api/y/route.ts", "staff/more.ts", "staff/x/page.tsx"]);
    });
  });
});
