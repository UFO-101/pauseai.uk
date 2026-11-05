import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// Every scheduled job runs as a run of the import log: inside
// keepingFailure() (lib/server/import-runs.ts), so that a failure is kept
// as a failed run and emailed about, and what it reports with problem() has
// a run to go on. Without it, a failure reaches only Netlify's logs. This
// fails on any route under app/api/cron whose lib/server imports include no
// module that calls keepingFailure.

const ROOT = join(__dirname, "..", "..");
const CRON = join(ROOT, "app", "api", "cron");

/** The lib/server modules `source` imports, as paths from the root. */
export function serverImports(source: ts.SourceFile): string[] {
  const found: string[] = [];
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const from = statement.moduleSpecifier.text;
    if (from.startsWith("@/lib/server/")) found.push(`${from.slice(2)}.ts`);
  }
  return found;
}

function parse(file: string, text: string): ts.SourceFile {
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

describe("cron routes", () => {
  it("reads a route's lib/server imports", () => {
    const code = `
      import { NextResponse } from "next/server";
      import { isCronRequest } from "@/lib/server/cron";
      import { importLuma } from "@/lib/server/luma-import";
      import { NIGHTLY } from "@/lib/import-runs";`;
    expect(serverImports(parse("route.ts", code))).toEqual(["lib/server/cron.ts", "lib/server/luma-import.ts"]);
  });

  it("every cron route runs as a run of the import log", () => {
    const routes = readdirSync(CRON).map((job) => join(CRON, job, "route.ts"));
    const outside = routes.filter((path) => {
      const imported = serverImports(parse(path, readFileSync(path, "utf8")));
      return !imported.some((module) => readFileSync(join(ROOT, module), "utf8").includes("keepingFailure("));
    });
    expect(
      outside.map((path) => relative(ROOT, path)),
      "run the job inside keepingFailure(), so its failures and problems are kept",
    ).toEqual([]);
  });
});
