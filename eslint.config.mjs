import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// The database's connection string: only lib/server/db.ts connects, and the
// test helper points it at a fresh database.
const DATABASE_URL_RULE = {
  selector: "MemberExpression[property.name='NETLIFY_DB_URL']",
  message: "Only lib/server/db.ts connects to the database. Query through it.",
};
const PG_IMPORT = { name: "pg", message: "Only lib/server/db.ts connects to the database. Query through it." };

// The site's own address: every absolute URL on it, in an email or a
// redirect, comes from siteUrl() in lib/site-url.ts, which uses the deploy's
// address. A request's own URL or Host is the wrong one on Netlify
// (main--pauseaiuk.netlify.app), and whoever sends the request can set it.
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

// Outside services are called only from their bindings in
// lib/server/outside-services/, through outsideFetch, so a fixture build
// answers from tests/fixtures instead. Nothing else imports outsideFetch,
// and server code never calls fetch() itself.
const OUTSIDE = "lib/server/outside-services";
const OUTSIDE_FETCH_IMPORT = {
  group: ["**/outside-fetch"],
  importNames: ["outsideFetch"],
  message: `Outside services are called only from their bindings in ${OUTSIDE}/. Use one, or add one there.`,
};
const OUTSIDE_FETCH_RULE = {
  selector: "CallExpression[callee.name='fetch']",
  message: `Call outside services from a binding in ${OUTSIDE}/, through outsideFetch, so fixture builds can answer instead.`,
};

// Each service's API is named only in its own binding. `host` is a regular
// expression over strings in the code, where "." also stands for "/".
// Parliament's Members API and ControlAI's letter are linked from pages
// too, so their hosts can appear anywhere; they're fetched only from their
// bindings like every other service.
const SERVICES = [
  {
    name: "Airtable",
    files: ["airtable.ts"],
    host: "api\\.airtable\\.com",
    why: "so its signed-only filter and field whitelist can't be bypassed",
  },
  // Luma's API, not its event pages, which are ordinary links.
  {
    name: "Luma's API",
    files: ["luma-api.ts", "luma-calendar.ts", "luma-guests.ts"],
    host: "(?:api2|public-api)\\.luma\\.com",
    why: "and its key stays on the server",
  },
  {
    name: "Postmark",
    files: ["postmark.ts"],
    host: "api\\.postmarkapp\\.com",
    why: "and email is sent with send() from lib/server/email.ts",
  },
  {
    name: "Google's OAuth and Gmail",
    files: ["gmail.ts"],
    host: "(?:oauth2|gmail|openidconnect)\\.googleapis\\.com|accounts\\.google\\.com.o.oauth2",
    why: "and email is sent with send() from lib/server/email.ts",
  },
  { name: "postcodes.io", files: ["postcodes.ts"], host: "api\\.postcodes\\.io" },
  // Stripe's API, not the donate links, which are payment pages on donate.stripe.com.
  { name: "Stripe's API", files: ["stripe.ts"], host: "api\\.stripe\\.com", why: "and its key stays on the server" },
  // Turnstile's server-side check, not the widget's script, which the browser loads.
  { name: "Turnstile", files: ["turnstile.ts"], host: "challenges\\.cloudflare\\.com.turnstile.v0.siteverify" },
].map((service) => ({ ...service, files: service.files.map((file) => `${OUTSIDE}/${file}`) }));

const hostRule = ({ name, files, host, why }) => ({
  selector: `Literal[value=/${host}/], TemplateElement[value.raw=/${host}/]`,
  message: `${name} is called only from ${files.join(" and ")}${why ? `, ${why}` : ""}.`,
});

// Email goes out only through send() in lib/server/email.ts, which skips
// blocked addresses and records each send, so a bounce can be traced to
// what was sent. Only it uses Postmark's binding to send or unblock.
const POSTMARK_IMPORT = {
  group: ["**/postmark"],
  importNames: ["sendEmail", "unsuppress"],
  message:
    "Send email with send() from lib/server/email.ts, which skips blocked addresses and records each send; unblock with unblock().",
};
const GMAIL_IMPORT = {
  group: ["**/gmail"],
  importNames: ["sendGmail"],
  message: "Send email with send() from lib/server/email.ts, which skips blocked addresses and records each send.",
};

// Packages that make their own requests, which a fixture build can't
// answer: Node's network modules, HTTP clients, and services' own SDKs.
// Postmark and Airtable are called over their HTTP APIs, not their SDKs.
const NETWORK_IMPORTS = [
  "http",
  "https",
  "net",
  "tls",
  "node:http",
  "node:https",
  "node:net",
  "node:tls",
  "undici",
  "axios",
  "node-fetch",
  "got",
  "ky",
  "postmark",
  "airtable",
].map((name) => ({
  name,
  message: `Call outside services from a binding in ${OUTSIDE}/, through outsideFetch, so fixture builds can answer instead.`,
}));

/**
 * no-restricted-syntax and no-restricted-imports for the site's own code:
 * everything above, but for what the file is allowed. `service` may name
 * its own API; `fetch` may call fetch() (code that runs in the browser
 * fetches the site's own API); `outsideFetch` may import it; `sendEmail`
 * may use Postmark's binding to send. `staff` adds the staff pages' rule for
 * links that look like buttons.
 */
function siteCodeRules({
  service,
  siteUrl = false,
  database = false,
  fetch = false,
  outsideFetch = false,
  sendEmail = false,
  staff = false,
}) {
  return {
    "no-restricted-syntax": [
      "error",
      ...(database ? [] : [DATABASE_URL_RULE]),
      ...(siteUrl ? [] : [SITE_URL_RULE]),
      ...SERVICES.filter((other) => other !== service).map(hostRule),
      ...(fetch ? [] : [OUTSIDE_FETCH_RULE]),
      ...EXTERNAL_LINK_RULES,
      ...(staff ? STAFF_BUTTON_LINK_RULES : []),
    ],
    "no-restricted-imports": [
      "error",
      {
        paths: [...(database ? [] : [PG_IMPORT]), ...NETWORK_IMPORTS],
        patterns: [
          ...(sendEmail ? [] : [POSTMARK_IMPORT, GMAIL_IMPORT]),
          ...(outsideFetch ? [] : [OUTSIDE_FETCH_IMPORT]),
        ],
      },
    ],
  };
}

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

// Every link out of the site opens in a new tab, and sends no referrer: the
// visitor keeps their place here (docs/style-guide.md, "Links"). The first
// catches an <a> with a literal outside URL and no target="_blank"; the second
// any <a target="_blank"> whose rel lacks noreferrer. An href that's an
// expression (href={site.shopUrl}) can't be checked here, so it's on the
// writer. Component tests are exempt below.
const EXTERNAL_LINK_RULES = [
  {
    selector:
      "JSXOpeningElement[name.name='a']:has(JSXAttribute[name.name='href'] > Literal[value=/^https?:/]):not(:has(JSXAttribute[name.name='target'] > Literal[value='_blank']))",
    message:
      'A link out of the site opens in a new tab: add target="_blank" rel="noreferrer" (docs/style-guide.md, "Links").',
  },
  {
    selector:
      "JSXOpeningElement[name.name='a']:has(JSXAttribute[name.name='target'] > Literal[value='_blank']):not(:has(JSXAttribute[name.name='rel'] > Literal[value=/noreferrer/]))",
    message: 'A link that opens in a new tab sends no referrer: add rel="noreferrer" (docs/style-guide.md, "Links").',
  },
];

// The staff pages' links show they're waiting for the next page: a link is
// ui/StaffLink, which runs its navigation as a transition and shows the line
// along the top, never next/link alone; and one that looks like a button is
// a StaffLink with buttonClass, not a plain <a> (docs/style-guide.md,
// "Buttons that wait"). StaffLink itself, and tests, are exempt below.
const STAFF_LINK_IMPORT = {
  name: "next/link",
  message:
    'In the staff pages, link with ui/StaffLink, which shows the line along the top while the next page comes (docs/style-guide.md, "Buttons that wait").',
};
const STAFF_BUTTON_LINK_RULES = [
  {
    selector:
      "JSXOpeningElement[name.name=/^(a|Link)$/]:has(JSXAttribute[name.name='className'] CallExpression[callee.name='buttonClass'])",
    message:
      'A link that looks like a button is a StaffLink with buttonClass, so it shows it\'s waiting for the next page (docs/style-guide.md, "Buttons that wait").',
  },
];

// Which folders may import which (docs/code-structure.md). lib/ is logic
// and data, so it imports neither components nor routes; the site's
// content in lib/content/ is written partly in JSX, so it may use
// components. Code is shared between routes from components/ or lib/, or
// from a _components/ folder above both, by a relative path: never from
// another route's folder, by the @/app/ alias or by a relative path that
// climbs into one. The component gallery imports every route's components
// to show them. Tests may reach across, to load what they test. These use
// typescript-eslint's copy of no-restricted-imports, so they're
// independent of the per-file lists in siteCodeRules().
const ROUTE_IMPORTS = [
  {
    group: ["@/app", "@/app/**"],
    message:
      "Share code between routes from components/ or lib/, or from a _components/ folder above both. See LAYERS in eslint.config.mjs.",
  },
  {
    regex: "^(\\./|(\\.\\./)+)(?!_components/|\\.\\./)[^/]+/(.*/)?_components(/|$)",
    message:
      "That's another route's _components/. Share code between routes from components/ or lib/, or from a _components/ folder above both.",
  },
];
const COMPONENT_IMPORTS = {
  group: ["@/components", "@/components/**"],
  message: "lib/ is logic and data, without React components. See LAYERS in eslint.config.mjs.",
};
// A page that sends people elsewhere does it in next.config.ts's
// redirects(), not with redirect() while rendering: on a click within the
// site, a page that redirects leaves the layout's header and footer with
// nothing between them for a moment.
const PAGE_REDIRECT = {
  name: "next/navigation",
  importNames: ["redirect", "permanentRedirect"],
  message:
    "Send people elsewhere from next.config.ts's redirects(), or, for a redirect that depends on the request, a lib/ helper the page calls first: a page that redirects while rendering shows the layout empty for a moment on a client-side navigation.",
};
const LAYERS = [
  { files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"], patterns: ROUTE_IMPORTS },
  { files: ["app/**/page.tsx"], patterns: ROUTE_IMPORTS, paths: [PAGE_REDIRECT] },
  { files: ["lib/**/*.{ts,tsx}"], ignores: ["lib/content/**"], patterns: [...ROUTE_IMPORTS, COMPONENT_IMPORTS] },
  // The staff pages', after the two above, whose lists they'd replace, so they keep them.
  {
    files: ["app/(staff)/**/*.{ts,tsx}"],
    ignores: ["app/(staff)/staff/_components/ui/StaffLink.tsx"],
    patterns: ROUTE_IMPORTS,
    paths: [STAFF_LINK_IMPORT],
  },
  { files: ["app/(staff)/**/page.tsx"], patterns: ROUTE_IMPORTS, paths: [PAGE_REDIRECT, STAFF_LINK_IMPORT] },
].map(({ files, ignores = [], patterns, paths = [] }) => ({
  files,
  ignores: ["**/*.test.{ts,tsx}", "app/(tools)/gallery/**", ...ignores],
  rules: { "@typescript-eslint/no-restricted-imports": ["error", { patterns, paths }] },
}));

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-syntax": ["error", DATABASE_URL_RULE, ...EXTERNAL_LINK_RULES],
      "no-restricted-imports": [
        "error",
        { paths: [PG_IMPORT], patterns: [POSTMARK_IMPORT, GMAIL_IMPORT, OUTSIDE_FETCH_IMPORT] },
      ],
    },
  },
  // Component tests link to example.org to exercise a component, not to send
  // anyone there. Only .tsx has JSX, so .ts tests keep the rules above.
  { files: ["**/*.test.tsx"], rules: { "no-restricted-syntax": ["error", DATABASE_URL_RULE] } },
  // The bindings' tests, which call outsideFetch and Postmark's binding directly.
  { files: [`${OUTSIDE}/**/*.test.ts`], rules: { "no-restricted-imports": ["error", { paths: [PG_IMPORT] }] } },
  // The database's one connection, the test helper that gives each test
  // file its own database, and the scripts that make the local ones.
  {
    files: [
      "lib/server/db.ts",
      "lib/server/db.test.ts",
      "tests/database.ts",
      "scripts/db-migrate.mjs",
      "scripts/db-reset.mjs",
      "scripts/serve-fixture.mjs",
      "scripts/serve-main.mjs",
    ],
    rules: { "no-restricted-imports": "off", "no-restricted-syntax": "off" },
  },
  // The site's own code, not its tests. A later block's list replaces an
  // earlier one's, so each file allowed one of these things comes after.
  ...[
    { files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}", "proxy.ts"], fetch: true },
    { files: ["app/(staff)/**/*.tsx"], fetch: true, staff: true },
    { files: ["lib/server/**/*.ts", "app/**/route.ts", "app/**/actions.ts"] },
    { files: [`${OUTSIDE}/*.ts`], outsideFetch: true },
    ...SERVICES.map((service) => ({ files: service.files, service, outsideFetch: true })),
    { files: [`${OUTSIDE}/outside-fetch.ts`], fetch: true },
    { files: ["lib/server/email.ts"], sendEmail: true },
    { files: ["lib/site-url.ts"], siteUrl: true },
    { files: ["lib/server/db.ts"], database: true },
  ].map(({ files, ...allowed }) => ({ files, ignores: ["**/*.test.{ts,tsx}"], rules: siteCodeRules(allowed) })),
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}", ...UNCONVERTED_DOM_EDITS],
    rules: { "no-restricted-properties": ["error", ...DIRECT_DOM_EDITS] },
  },
  ...LAYERS,
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
