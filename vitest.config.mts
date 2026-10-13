import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import path from "node:path";

// Two projects, one coverage report (see docs/testing.md):
//
// - "node" runs logic tests (*.test.ts) in Node: lib/, app/api/, sitemap.
// - "browser" runs component tests (*.browser.test.tsx) in real Chromium via
//   Playwright, so layout, canvas and matchMedia are the real thing.
//
// tests/ is the Playwright suite (behaviour and visual), run separately.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["**/*.test.ts"],
          exclude: ["**/node_modules/**", "tests/behaviour/**", "tests/visual/**", "plans/**", "**/*.browser.test.*"],
          setupFiles: ["./vitest.setup.node.ts"],
        },
      },
      {
        extends: true,
        // Next's client modules (next/link, next/image) read build-time
        // flags from process.env, which only exists when Next compiles them.
        define: { "process.env": JSON.stringify({ NODE_ENV: "test" }) },
        test: {
          name: "browser",
          include: ["**/*.browser.test.{ts,tsx}"],
          exclude: ["**/node_modules/**", "tests/**", "plans/**"],
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
      // A ratchet: today's levels, raised as tests land, until every file
      // is at 100 (then `perFile: true` with 100 everywhere).
      thresholds: {
        lines: 22,
        branches: 25,
        functions: 20,
        statements: 22,
      },
    },
  },
});
