import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const AIRTABLE_DOMAIN_PATTERN =
  "Literal[value=/api\\.airtable\\.com/], TemplateElement[value.raw=/api\\.airtable\\.com/]";
// Luma's API hosts (api2.luma.com, public-api.luma.com), not its lu.ma event
// pages, which are ordinary links.
const LUMA_API_PATTERN =
  "Literal[value=/(?:api2|public-api)\\.luma\\.com/], TemplateElement[value.raw=/(?:api2|public-api)\\.luma\\.com/]";

// The database's connection string: only lib/server/db.ts connects, and the
// test helper points it at a fresh database.
const DATABASE_URL_PATTERN = "MemberExpression[property.name='NETLIFY_DB_URL']";
const DATABASE_URL_RULE = {
  selector: DATABASE_URL_PATTERN,
  message: "Only lib/server/db.ts connects to the database. Query through it.",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: AIRTABLE_DOMAIN_PATTERN,
          message:
            "Airtable API calls must go through lib/server/airtable.ts so the signed-only filter and field whitelist can't be bypassed by a new call site.",
        },
        {
          selector: LUMA_API_PATTERN,
          message:
            "Luma API calls belong in lib/server/ (through outsideFetch), so tests can swap in fixtures and the API key stays on the server.",
        },
        DATABASE_URL_RULE,
      ],
      "no-restricted-imports": [
        "error",
        { paths: [{ name: "pg", message: "Only lib/server/db.ts connects to the database. Query through it." }] },
      ],
    },
  },
  // lib/server/airtable.ts is the one file allowed to reference the Airtable
  // domain; its test file legitimately asserts against that domain too.
  {
    files: ["lib/server/airtable.ts", "lib/server/airtable.test.ts"],
    rules: {
      "no-restricted-syntax": ["error", { selector: LUMA_API_PATTERN, message: "Luma API calls belong in other lib/server/ files." }, DATABASE_URL_RULE],
    },
  },
  // The Luma clients, their tests, and the shared fixtures that stand in for
  // Luma in tests.
  {
    files: ["lib/server/luma-*.ts", "lib/server/outside-fetch.test.ts", "tests/fixtures/**"],
    rules: {
      "no-restricted-syntax": ["error", { selector: AIRTABLE_DOMAIN_PATTERN, message: "Airtable API calls must go through lib/server/airtable.ts." }, DATABASE_URL_RULE],
    },
  },
  // The database's one connection, the test helper that gives each test
  // file its own database, and the script that makes the local one.
  {
    files: ["lib/server/db.ts", "lib/server/db.test.ts", "tests/database.ts", "playwright.config.ts", "scripts/db-reset.mjs"],
    rules: {
      "no-restricted-imports": "off",
      "no-restricted-syntax": [
        "error",
        { selector: AIRTABLE_DOMAIN_PATTERN, message: "Airtable API calls must go through lib/server/airtable.ts." },
        { selector: LUMA_API_PATTERN, message: "Luma API calls belong in lib/server/." },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated test output and local scratch files.
    "playwright-report/**",
    "test-results/**",
    "coverage/**",
    ".vitest/**",
    "tmp/**",
  ]),
]);

export default eslintConfig;
