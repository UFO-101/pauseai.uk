#!/usr/bin/env node
// Reuses the no-restricted-syntax rule already defined in eslint.config.mjs
// (the single source of truth for the "api.airtable.com" pattern) but only
// fails on that rule, so this doesn't get blocked by unrelated pre-existing
// lint debt elsewhere in the repo.
import { ESLint } from "eslint";

const eslint = new ESLint();
const results = await eslint.lintFiles(["**/*.{js,jsx,mjs,ts,tsx}"]);

const violations = results.flatMap((result) =>
  result.messages
    .filter((msg) => msg.ruleId === "no-restricted-syntax")
    .map((msg) => ({ filePath: result.filePath, ...msg })),
);

if (violations.length > 0) {
  for (const v of violations) {
    console.error(`${v.filePath}:${v.line}:${v.column}  ${v.message}`);
  }
  console.error(
    `\n${violations.length} Airtable API reference(s) found outside lib/airtable.ts — the signed-only filter could be bypassed.`,
  );
  process.exit(1);
}

console.log("OK: Airtable API access confined to lib/airtable.ts");
