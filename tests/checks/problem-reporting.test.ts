import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// Something going wrong is reported with problem() (lib/server/problems.ts),
// never written to the log by hand. console.error reaches only Netlify's
// logs, where nobody looks; problem() logs it and keeps it on the run.
// String(error) drops the error's cause, so a network failure is kept as
// "fetch failed" and nothing more; problem() and describeError() keep it.
// This fails on either in the code where jobs and requests run: lib/server,
// app/api and netlify/functions, other than problems.ts itself. Warnings and
// information (console.warn, console.log) are for what isn't a problem.

const ROOT = join(__dirname, "..", "..");
const DIRS = ["lib/server", "app/api", "netlify/functions"];
const HELPER = "lib/server/problems.ts";

/** Names an error is usually caught as. */
const ERROR_NAMES = /^(e|err|error|cause|reason)$/;

function codeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return codeFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

/** Every console.error and String(error) in `source`, as "what@line". */
export function handWrittenReports(source: ts.SourceFile): string[] {
  const found: string[] = [];
  const at = (node: ts.Node) => source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
  const visit = (node: ts.Node) => {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "console" &&
      node.name.text === "error"
    ) {
      found.push(`console.error@${at(node)}`);
    }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "String" &&
      node.arguments.length === 1 &&
      ts.isIdentifier(node.arguments[0]) &&
      ERROR_NAMES.test(node.arguments[0].text)
    ) {
      found.push(`String(${node.arguments[0].text})@${at(node)}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

function parse(file: string, text: string): ts.SourceFile {
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

describe("problem reporting", () => {
  it("finds console.error and String(error), and lets warnings, information and other strings through", () => {
    const code = `
      console.error("x", e);
      console.warn("y");
      console.log("z");
      const a = String(error), b = String(err), c = String(reason);
      const d = String(42), f = String(name);
      problem("It broke", error);`;
    expect(handWrittenReports(parse("a.ts", code))).toEqual([
      "console.error@2",
      "String(error)@5",
      "String(err)@5",
      "String(reason)@5",
    ]);
  });

  it("nothing where jobs and requests run writes an error to the log by hand, or loses its cause", () => {
    const hits = DIRS.flatMap((dir) => codeFiles(join(ROOT, dir))).flatMap((path) => {
      const file = relative(ROOT, path);
      if (file === HELPER) return [];
      return handWrittenReports(parse(file, readFileSync(path, "utf8"))).map((hit) => `${file}  ${hit}`);
    });
    expect(hits, "report it with problem(), or describe it with describeError()").toEqual([]);
  });
});
