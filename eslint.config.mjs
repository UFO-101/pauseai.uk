import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const AIRTABLE_DOMAIN_PATTERN =
  "Literal[value=/api\\.airtable\\.com/], TemplateElement[value.raw=/api\\.airtable\\.com/]";

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
            "Airtable API calls must go through lib/airtable.ts so the signed-only filter and field whitelist can't be bypassed by a new call site.",
        },
      ],
    },
  },
  // lib/airtable.ts is the one file allowed to reference the Airtable domain;
  // its test file legitimately asserts against that domain too.
  {
    files: ["lib/airtable.ts", "lib/airtable.test.ts"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
