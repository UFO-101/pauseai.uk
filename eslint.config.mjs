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

// Components show state through what they render. Finding the page's
// elements and editing them directly goes behind React's back: it can
// re-render over the change, and the page's state ends up split between
// React and the DOM. Hold the state in React (useState, context) instead,
// and use a ref for an element an effect has to measure or observe.
const DOM_EDIT_MESSAGE =
  "Render this from React state, not by editing the page directly. See DIRECT_DOM_EDITS in eslint.config.mjs.";
const DIRECT_DOM_EDITS = [
  // Looking elements up across the page. Inside a ref's element is fine.
  ...[
    "querySelector",
    "querySelectorAll",
    "getElementById",
    "getElementsByClassName",
    "getElementsByTagName",
    "getElementsByName",
  ].map((property) => ({ object: "document", property, message: DOM_EDIT_MESSAGE })),
  // Changing elements, wherever they came from.
  ...[
    "classList",
    "setAttribute",
    "removeAttribute",
    "toggleAttribute",
    "innerHTML",
    "outerHTML",
    "insertAdjacentHTML",
  ].map((property) => ({ property, message: DOM_EDIT_MESSAGE })),
];
// Written before the rule, and still editing the page directly. Take a file
// off this list when it's converted; don't add to it.
const UNCONVERTED_DOM_EDITS = [
  "app/(site)/_components/HeroMarqueeEffects.tsx",
  "app/(site)/future-of-workforce-inquiry/_components/FootnoteTooltips.tsx",
  "components/layout/FooterYear.tsx",
  "components/layout/NoAnalytics.tsx",
];

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
      "no-restricted-syntax": [
        "error",
        { selector: LUMA_API_PATTERN, message: "Luma API calls belong in other lib/server/ files." },
        DATABASE_URL_RULE,
      ],
    },
  },
  // The Luma clients, their tests, and the shared fixtures that stand in for
  // Luma in tests.
  {
    files: ["lib/server/luma-*.ts", "lib/server/outside-fetch.test.ts", "tests/fixtures/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: AIRTABLE_DOMAIN_PATTERN, message: "Airtable API calls must go through lib/server/airtable.ts." },
        DATABASE_URL_RULE,
      ],
    },
  },
  // The database's one connection, the test helper that gives each test
  // file its own database, and the scripts that make the local ones.
  {
    files: [
      "lib/server/db.ts",
      "lib/server/db.test.ts",
      "tests/database.ts",
      "playwright.config.ts",
      "scripts/db-migrate.mjs",
      "scripts/db-reset.mjs",
      "scripts/serve-main.mjs",
    ],
    rules: {
      "no-restricted-imports": "off",
      "no-restricted-syntax": [
        "error",
        { selector: AIRTABLE_DOMAIN_PATTERN, message: "Airtable API calls must go through lib/server/airtable.ts." },
        { selector: LUMA_API_PATTERN, message: "Luma API calls belong in lib/server/." },
      ],
    },
  },
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}", ...UNCONVERTED_DOM_EDITS],
    rules: { "no-restricted-properties": ["error", ...DIRECT_DOM_EDITS] },
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
    "blob-report/**",
    // Netlify's build folder: its plugins, and the Deno and Node code they
    // bring with them. It's there during a Netlify build, which lints.
    ".netlify/**",
  ]),
]);

export default eslintConfig;
