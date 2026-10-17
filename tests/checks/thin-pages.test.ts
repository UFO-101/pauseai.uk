import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// Pages and layouts have no branches (docs/code-structure.md, "Pages are
// thin"). The coverage gate leaves them out, as they can't render in Vitest,
// so a branch in one would go untested: it belongs in a component or a lib/
// helper, where the gate reaches. lib/found.ts is the usual one: a page's
// "this or a 404". This fails on any if, ? :, &&, ||, ??, ?., switch, loop,
// try or default value in a page.tsx or layout.tsx.

const ROOT = join(__dirname, "..", "..");

function pages(dir = join(ROOT, "app")): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return pages(path);
    return entry.name === "page.tsx" || entry.name === "layout.tsx" ? [path] : [];
  });
}

const LOGICAL = new Set([
  ts.SyntaxKind.AmpersandAmpersandToken,
  ts.SyntaxKind.BarBarToken,
  ts.SyntaxKind.QuestionQuestionToken,
  ts.SyntaxKind.AmpersandAmpersandEqualsToken,
  ts.SyntaxKind.BarBarEqualsToken,
  ts.SyntaxKind.QuestionQuestionEqualsToken,
]);

/** What branches, if anything: "if", "?:", "&&", ... */
function branch(node: ts.Node): string | undefined {
  if (ts.isIfStatement(node)) return "if";
  if (ts.isConditionalExpression(node)) return "? :";
  if (ts.isSwitchStatement(node)) return "switch";
  if (ts.isTryStatement(node)) return "try";
  if (ts.isIterationStatement(node, false)) return "loop";
  if (ts.isBinaryExpression(node) && LOGICAL.has(node.operatorToken.kind)) return node.operatorToken.getText();
  if (
    (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node) || ts.isCallExpression(node)) &&
    node.questionDotToken
  )
    return "?.";
  if ((ts.isParameter(node) || ts.isBindingElement(node)) && node.initializer) return "default value";
  return undefined;
}

/** Every branch in some TSX, as "what@line". */
function branches(file: string, text: string): string[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    const what = branch(node);
    if (what) found.push(`${what}@${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe("thin pages", () => {
  it("finds each kind of branch", () => {
    const code = `
      export default async function Page({ a = 1, params }) {
        if (a) {}
        const b = a ? 1 : 2;
        const c = a && b, d = a || b, e = a ?? b;
        let f; f ||= 1; f &&= 2; f ??= 3;
        const g = params?.x, h = params?.["y"], i = params?.z?.();
        switch (a) {}
        for (;;) {} for (const x of []) {} for (const x in {}) {} while (a) {} do {} while (a);
        try {} catch {}
        const { j = 1 } = params;
        return <p>{a && <b />}</p>;
      }`;
    const kinds = branches("page.tsx", code).map((hit) => hit.split("@")[0]);
    for (const kind of [
      "if",
      "? :",
      "&&",
      "||",
      "??",
      "||=",
      "&&=",
      "??=",
      "?.",
      "switch",
      "loop",
      "try",
      "default value",
    ]) {
      expect(kinds).toContain(kind);
    }
    expect(kinds.filter((kind) => kind === "loop")).toHaveLength(5);
  });

  it("lets a plain page through: awaits, calls, maps and spreads", () => {
    const code = `
      export default async function Page({ params }) {
        const { slug } = await params;
        const post = found(findPost(slug));
        return <main {...props}>{posts.map((p) => <a key={p.slug}>{p.title}</a>)}</main>;
      }`;
    expect(branches("page.tsx", code)).toEqual([]);
  });

  it("no page or layout has a branch", () => {
    const offending = pages().flatMap((path) =>
      branches(path, readFileSync(path, "utf8")).map((hit) => `${relative(ROOT, path)}  ${hit}`),
    );
    expect(offending, "move these into a component or a lib/ helper").toEqual([]);
  });
});
