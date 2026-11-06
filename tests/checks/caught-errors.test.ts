import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// An error that's caught is rethrown or reported with problem()
// (lib/server/problems.ts), so that carrying on past it leaves a record on
// the run, or at least in the log. This fails on any catch block, or
// function passed to .catch(), that does neither, in the code where jobs and
// requests run: lib/server, app/api and netlify/functions. A named handler
// passed to .catch() is read too, so one that rethrows all but one error
// passes. The exceptions below are the few places that catch to answer a
// question ("is there a request?") rather than to carry on past a failure.

const ROOT = join(__dirname, "..", "..");
const DIRS = ["lib/server", "app/api", "netlify/functions"];

/** The catches that aren't losing anything, as "file  function", with why. */
const EXCEPTIONS = new Map([
  // Asking Next for the request's cookies throws outside a request: the catch is the question.
  ["lib/server/flow-database.ts  flowDatabase", "outside a request there's no cookie, and nothing to report"],
  // A development-only warning about migrations: the query after it reports the database being down.
  ["lib/server/db.ts  warnIfBehind", "the query that follows reports the database being unreachable"],
  // "Not JSON" is an answer, not a failure: the one place that swallows the parse error.
  ["lib/server/json.ts  parseJsonIfAny", "a body that isn't JSON is an answer the caller asked for"],
]);

function codeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return codeFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

/** Whether `node` has a throw, or a call to problem(), anywhere in it. */
function handles(node: ts.Node): boolean {
  if (ts.isThrowStatement(node)) return true;
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "problem") return true;
  return ts.forEachChild(node, handles) ?? false;
}

/** The name of the function `node` is in, for naming a hit. */
function enclosingFunction(node: ts.Node): string {
  for (let up: ts.Node | undefined = node; up; up = up.parent) {
    if ((ts.isFunctionDeclaration(up) || ts.isMethodDeclaration(up)) && up.name) return up.name.getText();
    if (ts.isVariableDeclaration(up) && ts.isIdentifier(up.name)) return up.name.text;
  }
  return "(top level)";
}

type Hit = { file: string; what: string; line: number; fn: string };

/** Every function declared by name across the files, for a named handler passed to .catch(). */
function declaredFunctions(sources: ts.SourceFile[]): Map<string, ts.Node> {
  const found = new Map<string, ts.Node>();
  for (const source of sources) {
    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name && node.body) found.set(node.name.text, node.body);
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return found;
}

/** Every catch that neither rethrows nor reports, in `sources`. */
export function unhandledCatches(sources: ts.SourceFile[]): Hit[] {
  const named = declaredFunctions(sources);
  const hits: Hit[] = [];
  for (const source of sources) {
    const hit = (node: ts.Node, what: string) =>
      hits.push({
        file: source.fileName,
        what,
        line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        fn: enclosingFunction(node),
      });
    const visit = (node: ts.Node) => {
      if (ts.isCatchClause(node) && !handles(node.block)) hit(node, "catch");
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "catch" &&
        node.arguments.length === 1
      ) {
        const [handler] = node.arguments;
        const body = ts.isIdentifier(handler) ? named.get(handler.text) : handler;
        if (!body || !handles(body)) hit(node, `.catch(${ts.isIdentifier(handler) ? handler.text : "…"})`);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return hits;
}

function parse(file: string, text: string): ts.SourceFile {
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

describe("caught errors", () => {
  it("finds a catch that swallows, and lets through one that rethrows, reports, or hands to a handler that does", () => {
    const code = `
      function unlessGone(error) { if (error.status === 404) return undefined; throw error; }
      function swallows(error) { return undefined; }
      async function a() {
        try { x(); } catch { return 1; }
        try { x(); } catch (e) { if (!(e instanceof Y)) throw e; }
        try { x(); } catch (e) { problem("It broke", e); }
        try { x(); } catch (e) { log(e); }
        await y().catch(unlessGone);
        await y().catch(swallows);
        await y().catch(() => null);
        await y().catch((e) => problem("Nope", e));
        await y().catch((e) => { throw new Z(e); });
      }`;
    const hits = unhandledCatches([parse("a.ts", code)]);
    expect(hits.map((h) => `${h.what}@${h.line} in ${h.fn}`)).toEqual([
      "catch@5 in a",
      "catch@8 in a",
      ".catch(swallows)@10 in a",
      ".catch(…)@11 in a",
    ]);
  });

  it("names the method or arrow function a catch is in, or the top level", () => {
    const code = `
      class C { async m() { try { x(); } catch { return 1; } } }
      const f = async () => { try { x(); } catch { return 1; } };
      try { x(); } catch { }`;
    expect(unhandledCatches([parse("b.ts", code)]).map((h) => h.fn)).toEqual(["m", "f", "(top level)"]);
  });

  it("every catch where jobs and requests run rethrows or reports, but for the few that answer a question", () => {
    const sources = DIRS.flatMap((dir) => codeFiles(join(ROOT, dir))).map((path) =>
      parse(relative(ROOT, path), readFileSync(path, "utf8")),
    );
    const hits = unhandledCatches(sources).map((h) => `${h.file}  ${h.fn}`);
    const unexplained = hits.filter((hit) => !EXCEPTIONS.has(hit));
    expect(unexplained, "rethrow the error, or report it with problem()").toEqual([]);
    // An exception that no longer catches anything is one to delete.
    expect([...EXCEPTIONS.keys()].filter((key) => !hits.includes(key))).toEqual([]);
  });
});
