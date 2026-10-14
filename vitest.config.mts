import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import path from "node:path";

// Two projects, one coverage report (see docs/testing.md):
//
// - "node" runs logic tests (*.test.ts, or .tsx for JSX) in Node: lib/,
//   app/api/, sitemap.
// - "browser" runs component tests (*.browser.test.tsx) in real Chromium via
//   Playwright, so layout, canvas and matchMedia are the real thing.
//
// tests/ is the Playwright suite (behaviour and visual), run separately.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
      // lib/server/* imports "server-only", which throws outside a React
      // server build. Tests run that code directly, so give them the no-op.
      "server-only": path.resolve(import.meta.dirname, "node_modules/server-only/empty.js"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["**/*.test.{ts,tsx}"],
          // Test files that need Postgres each make their own database
          // (tests/database.ts), so they can run in parallel.
          exclude: ["**/node_modules/**", "tests/behaviour/**", "tests/public-vs-live/**", "plans/**", "tmp/**", "**/*.browser.test.*"],
          setupFiles: ["./vitest.setup.node.ts"],
        },
      },
      {
        extends: true,
        // Next's client modules (next/link, next/image) read build-time
        // flags from process.env, which only exists when Next compiles them.
        define: { "process.env": JSON.stringify({ NODE_ENV: "test" }) },
        // Next's own ES module builds of these. The default entry points are
        // CommonJS, and Vite's interop around a CommonJS import shows up in
        // coverage as a branch, taken one way or the other depending on how
        // Vite happened to bundle the dependency.
        resolve: {
          alias: {
            "next/link": path.resolve(import.meta.dirname, "node_modules/next/dist/esm/client/link.js"),
            "next/image": path.resolve(import.meta.dirname, "node_modules/next/dist/esm/shared/lib/image-external.js"),
            "next/script": path.resolve(import.meta.dirname, "node_modules/next/dist/esm/client/script.js"),
          },
        },
        // Pre-bundle every browser dependency up front. If Vite discovers one
        // mid-run it re-optimises, which can load a second copy of React into
        // the page or lose track of the test runner.
        optimizeDeps: {
          include: [
            "react",
            "react-dom",
            "react-dom/client",
            "react-dom/server",
            "react/jsx-dev-runtime",
            "next/link",
            "next/image",
            "next/navigation",
            "next/script",
            "vitest-browser-react",
            "d3-geo",
            "topojson-client",
            "pdf-lib",
            "jszip",
            "qrcode-generator",
            "jsqr",
            "@tiptap/react",
            "@tiptap/starter-kit",
          ],
        },
        test: {
          name: "browser",
          include: ["**/*.browser.test.{ts,tsx}"],
          exclude: ["**/node_modules/**", "tests/**", "plans/**", "tmp/**"],
          setupFiles: ["./vitest.setup.browser.tsx"],
          // Drawing and exporting images is slow when every file runs at once, so waits get longer than the default second.
          expect: { poll: { timeout: 5000 } },
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
    coverage: {
      provider: "v8",
      // Every source file, so one that no test imports shows as 0% rather
      // than silently missing from the report.
      include: [
        "app/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "lib/**/*.{ts,tsx}",
        "tests/fixtures/**/*.ts",
        "next.config.ts",
        "proxy.ts",
        "netlify/functions/**/*.ts",
      ],
      // page.tsx and layout.tsx are the one scope rule: async server
      // components can't render in Vitest and layout.tsx needs next/font.
      // They're kept thin, and tests/behaviour/pages.spec.ts loads every
      // route instead. No other exclusions, and no ignore comments
      // (scripts/check-no-coverage-ignores.mjs).
      exclude: ["**/*.test.{ts,tsx}", "**/page.tsx", "**/layout.tsx"],
      reporter: ["text-summary", "json-summary", "html"],
      // Every file, on its own, at 100%.
      thresholds: { 100: true, perFile: true },
    },
  },
});
