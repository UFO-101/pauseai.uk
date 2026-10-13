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
          exclude: ["**/node_modules/**", "tests/behaviour/**", "tests/visual/**", "plans/**", "tmp/**", "**/*.browser.test.*"],
          setupFiles: ["./vitest.setup.node.ts"],
        },
      },
      {
        extends: true,
        // Next's client modules (next/link, next/image) read build-time
        // flags from process.env, which only exists when Next compiles them.
        define: { "process.env": JSON.stringify({ NODE_ENV: "test" }) },
        // Pre-bundle these up front. If Vite discovers one mid-run it
        // re-optimises and can load a second copy of React into the page.
        optimizeDeps: {
          include: ["react", "react-dom", "react-dom/client", "react/jsx-dev-runtime", "next/link", "next/image", "next/navigation"],
        },
        test: {
          name: "browser",
          include: ["**/*.browser.test.{ts,tsx}"],
          exclude: ["**/node_modules/**", "tests/**", "plans/**", "tmp/**"],
          setupFiles: ["./vitest.setup.browser.tsx"],
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
      ],
      // page.tsx and layout.tsx are the one scope rule: async server
      // components can't render in Vitest and layout.tsx needs next/font.
      // They're kept thin, and tests/behaviour/pages.spec.ts loads every
      // route instead. No other exclusions, and no ignore comments
      // (scripts/check-no-coverage-ignores.mjs).
      exclude: ["**/*.test.{ts,tsx}", "**/page.tsx", "**/layout.tsx"],
      reporter: ["text-summary", "json-summary", "html"],
      // The logic layer is held at 100%. The overall numbers are a ratchet:
      // raised as component tests land, never lowered, until every file is
      // at 100 (then `perFile: true` with 100 everywhere).
      thresholds: {
        lines: 42,
        branches: 43,
        functions: 32,
        statements: 42,
        "lib/**": { 100: true },
        "app/api/**": { 100: true },
        "app/{sitemap,robots}.ts": { 100: true },
        "tests/fixtures/**": { 100: true },
        "next.config.ts": { 100: true },
      },
    },
  },
});
