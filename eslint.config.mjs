import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const AIRTABLE_DOMAIN_PATTERN =
  "Literal[value=/api\\.airtable\\.com/], TemplateElement[value.raw=/api\\.airtable\\.com/]";
// Luma's API hosts (api2.luma.com, public-api.luma.com), not its lu.ma event
// pages, which are ordinary links.
const LUMA_API_PATTERN =
  "Literal[value=/(?:api2|public-api)\\.luma\\.com/], TemplateElement[value.raw=/(?:api2|public-api)\\.luma\\.com/]";

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
      ],
    },
  },
  // lib/server/airtable.ts is the one file allowed to reference the Airtable
  // domain; its test file legitimately asserts against that domain too.
  {
    files: ["lib/server/airtable.ts", "lib/server/airtable.test.ts"],
    rules: {
      "no-restricted-syntax": ["error", { selector: LUMA_API_PATTERN, message: "Luma API calls belong in other lib/server/ files." }],
    },
  },
  // The Luma clients, their tests, and the shared fixtures that stand in for
  // Luma in tests.
  {
    files: ["lib/server/luma-*.ts", "lib/server/outside-fetch.test.ts", "tests/fixtures/**"],
    rules: {
      "no-restricted-syntax": ["error", { selector: AIRTABLE_DOMAIN_PATTERN, message: "Airtable API calls must go through lib/server/airtable.ts." }],
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
