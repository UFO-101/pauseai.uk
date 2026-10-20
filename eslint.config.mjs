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

const AIRTABLE_RULE = {
  selector: AIRTABLE_DOMAIN_PATTERN,
  message:
    "Airtable API calls must go through lib/server/airtable.ts so the signed-only filter and field whitelist can't be bypassed by a new call site.",
};
const LUMA_RULE = {
  selector: LUMA_API_PATTERN,
  message:
    "Luma API calls belong in lib/server/ (through outsideFetch), so tests can swap in fixtures and the API key stays on the server.",
};

// The site's own address: every absolute URL on it, in an email or a
// redirect, comes from siteUrl() in lib/site-url.ts, which uses the deploy's
// address. A request's own URL or Host is the wrong one on Netlify
// (main--pauseaiuk.netlify.app), and whoever sends the request can set it.
// For the site's own code; tests and mocks of outside APIs read requests'
// URLs freely.
const SITE_URL_RULE = {
  selector: [
    "MemberExpression[property.name='SITE_ORIGIN']",
    "MemberExpression[property.name='url'][object.name=/^req(uest)?$/]",
    "MemberExpression[property.name=/^(origin|host|hostname)$/][object.property.name='nextUrl']",
    "CallExpression[callee.property.name='get'][arguments.0.value=/^(host|origin|x-forwarded-host)$/i]",
  ].join(", "),
  message:
    "Build URLs on this site with siteUrl() from lib/site-url.ts. The request's own URL and Host are netlify.app on Netlify, and can be forged.",
};

// Email goes out only through send() in lib/server/email.ts, which skips
// blocked addresses and records each send, so a bounce can be traced to
// what was sent. Only it calls Postmark's client, lib/server/postmark.ts,
// and only that names Postmark's API.
const PG_IMPORT = { name: "pg", message: "Only lib/server/db.ts connects to the database. Query through it." };
const POSTMARK_IMPORT = {
  group: ["**/postmark", "@/lib/server/postmark"],
  importNames: ["sendEmail", "unsuppress"],
  message:
    "Send email with send() from lib/server/email.ts, which skips blocked addresses and records each send; unblock with unblock().",
};
const POSTMARK_API_RULE = {
  selector: "Literal[value=/api\\.postmarkapp\\.com/], TemplateElement[value.raw=/api\\.postmarkapp\\.com/]",
  message: "Postmark is called only from lib/server/postmark.ts. Send email with send() from lib/server/email.ts.",
};

// Outside services are called through outsideFetch (lib/server/outside-fetch.ts),
// so a fixture build answers from tests/fixtures instead.
const OUTSIDE_FETCH_RULE = {
  selector: "CallExpression[callee.name='fetch']",
  message:
    "Call outside services with outsideFetch from lib/server/outside-fetch.ts, so fixture builds can answer instead.",
};

/** What the site's own code may not do, outside the one file allowed each thing. */
const SITE_CODE_RULES = [AIRTABLE_RULE, LUMA_RULE, DATABASE_URL_RULE, SITE_URL_RULE, POSTMARK_API_RULE];

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
      "no-restricted-syntax": ["error", AIRTABLE_RULE, LUMA_RULE, DATABASE_URL_RULE],
      "no-restricted-imports": ["error", { paths: [PG_IMPORT], patterns: [POSTMARK_IMPORT] }],
    },
  },
  // The one file that sends email through Postmark, and Postmark's own tests.
  {
    files: ["lib/server/email.ts", "lib/server/postmark.test.ts"],
    rules: { "no-restricted-imports": ["error", { paths: [PG_IMPORT] }] },
  },
  // The site's own code, but for the files allowed one of these things,
  // which have their own no-restricted-syntax below (a later list replaces
  // an earlier one). Server code also calls outside services only through
  // outsideFetch.
  ...[
    {
      files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}", "proxy.ts"],
      rules: SITE_CODE_RULES,
    },
    {
      files: ["lib/server/**/*.ts", "app/**/route.ts", "app/**/actions.ts"],
      rules: [...SITE_CODE_RULES, OUTSIDE_FETCH_RULE],
    },
  ].map(({ files, rules }) => ({
    files,
    ignores: [
      "**/*.test.{ts,tsx}",
      "lib/site-url.ts",
      "lib/server/airtable.ts",
      "lib/server/luma-*.ts",
      "lib/server/db.ts",
      "lib/server/postmark.ts",
      "lib/server/outside-fetch.ts",
    ],
    rules: { "no-restricted-syntax": ["error", ...rules] },
  })),
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
