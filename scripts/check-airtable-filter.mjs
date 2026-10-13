#!/usr/bin/env node
// Reuses the no-restricted-syntax rules already defined in eslint.config.mjs
// (the single source of truth for the "api.airtable.com" and Luma API
// patterns) but only
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
    `\n${violations.length} outside-service API reference(s) found outside lib/server/ — Airtable's signed-only filter could be bypassed, or a call could skip the test fixtures.`,
  );
  process.exit(1);
}

console.log("OK: Airtable and Luma API access confined to lib/server/");
