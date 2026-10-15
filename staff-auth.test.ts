import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import ts from "typescript";
import { afterEach, describe, expect, it } from "vitest";

// Every staff page, route handler and Server Action under app/(staff)/ must
// call requireStaff() first. proxy.ts only checks that a cookie exists; this
// is what makes every staff entry point check the session in the database
// (plans/email-your-mp-v2.md, "Staff interface").
//
// Each exported function is its own entry point: a page's default export, a
// route's GET or POST, and every function in a "use server" file. So each is
// checked on its own, by parsing the code, and a mention in a comment
// doesn't count.
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
    .map((path) => ({ name: relative(root, path).split("\\").join("/"), source: readFileSync(path, "utf8") }))
    .filter(({ name, source }) => /(^|\/)(page|route)\.tsx?$/.test(name) || /^\s*["']use server["']/m.test(source));
}

function isExported(node: ts.Node): boolean {
  return ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

// A call to requireStaff() in this code, but not inside a function defined
// there, which might never run.
function callsRequireStaff(node: ts.Node): boolean {
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "requireStaff") {
    return true;
  }
  if (ts.isFunctionLike(node)) return false;
  return ts.forEachChild(node, callsRequireStaff) ?? false;
}

/** What's wrong with one entry point file: each exported function that doesn't call requireStaff() first. */
function problems(name: string, source: string): string[] {
  const kind = name.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const file = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, kind);
  const found: string[] = [];

  function check(fn: string, body: ts.Node | undefined) {
    const first = body && ts.isBlock(body) ? body.statements[0] : body;
    if (!first || !callsRequireStaff(first)) found.push(`${name}: ${fn} doesn't call requireStaff() first`);
  }

  for (const statement of file.statements) {
    if (ts.isFunctionDeclaration(statement) && isExported(statement)) {
      check(statement.name?.text ?? "default export", statement.body);
    } else if (ts.isVariableStatement(statement) && isExported(statement)) {
      for (const { name: variable, initializer } of statement.declarationList.declarations) {
        if (initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))) {
          check(variable.getText(), initializer.body);
        } else if (initializer && ts.isCallExpression(initializer)) {
          // A wrapped handler, which this can't see inside.
          found.push(`${name}: can't check ${variable.getText()}; write it as a function here`);
        }
      }
    } else if (ts.isExportAssignment(statement) || ts.isExportDeclaration(statement)) {
      if (!statement.getText().startsWith("export type")) {
        found.push(`${name}: can't check \`${statement.getText()}\`; export a function declared here`);
      }
    }
  }
  return found;
}

function unprotected(root: string): string[] {
  return entryPoints(root)
    .filter(({ name }) => !OPEN.has(name))
    .flatMap(({ name, source }) => problems(name, source));
}

describe("staff auth", () => {
  it("every staff page, route and Server Action calls requireStaff() first", () => {
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

    it("passes pages, routes and Server Actions that call it first, and skips the rest", () => {
      const root = tree({
        "staff/page.tsx": [
          "export const metadata = { title: 'Staff' };",
          "export type Search = { q?: string };",
          "export default async function Page() { const { email } = await requireStaff(); return email; }",
        ].join("\n"),
        "staff/api/thing/route.ts": [
          "export const dynamic = 'force-dynamic';",
          "export async function GET() { await requireStaff(); }",
          "export const POST = async () => requireStaff();",
          "export const PUT = async function () { await requireStaff(); };",
        ].join("\n"),
        "staff/actions.ts": [
          '"use server";',
          "export async function one() { await requireStaff(); }",
          "export async function two() { const { email } = await requireStaff(); return email; }",
          "async function helper() {}",
        ].join("\n"),
        "staff/login/page.tsx": "export default function Login() {}",
        "staff/api/login/route.ts": "export async function POST() {}",
        "staff/api/callback/route.ts": "export async function GET() {}",
        "staff/_components/Table.tsx": "export function Table() {}",
        "staff/page.test.tsx": "export function test() {}",
        "layout.tsx": "export default function Layout() {}",
      });
      expect(unprotected(root)).toEqual([]);
      expect(entryPoints(root)).toHaveLength(6);
    });

    it("finds each exported function that doesn't", () => {
      const root = tree({
        // Only a comment mentions it.
        "staff/x/page.tsx": "// Calls requireStaff() first.\nexport default async function Page() {}",
        "staff/api/y/route.ts": [
          "export async function GET() { await requireStaff(); }",
          // Not first: work happens before the session is checked.
          "export async function POST() { await work(); await requireStaff(); }",
          // Only inside a function that might never run.
          "export async function PUT() { const later = () => requireStaff(); }",
          "export const DELETE = async () => {};",
          "export const PATCH = wrap(handler);",
        ].join("\n"),
        // One of two actions forgets.
        "staff/more.ts":
          "'use server'\nexport async function ok() { await requireStaff(); }\nexport async function f() {}",
        "staff/z/page.tsx": "async function Page() {}\nexport default Page;",
        "staff/w/page.tsx": "async function Page() {}\nexport { Page as default };",
        "staff/v/page.tsx": "export default async function () {}",
        "staff/u/page.tsx": "export declare function Page(): void;",
      });
      expect(unprotected(root).sort()).toEqual([
        "staff/api/y/route.ts: DELETE doesn't call requireStaff() first",
        "staff/api/y/route.ts: POST doesn't call requireStaff() first",
        "staff/api/y/route.ts: PUT doesn't call requireStaff() first",
        "staff/api/y/route.ts: can't check PATCH; write it as a function here",
        "staff/more.ts: f doesn't call requireStaff() first",
        "staff/u/page.tsx: Page doesn't call requireStaff() first",
        "staff/v/page.tsx: default export doesn't call requireStaff() first",
        "staff/w/page.tsx: can't check `export { Page as default };`; export a function declared here",
        "staff/x/page.tsx: Page doesn't call requireStaff() first",
        "staff/z/page.tsx: can't check `export default Page;`; export a function declared here",
      ]);
    });
  });
});
