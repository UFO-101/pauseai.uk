import { defineConfig } from "vitest/config";

// Every file at 100%, as the site's own tests are. container/main.ts is left
// out: it only reads DATABASE_URL and starts the server that server.test.ts
// tests.
export default defineConfig({
  test: {
    environment: "node",
    // The container tests dump and restore real databases, which takes a few seconds each.
    testTimeout: 60_000,
    coverage: {
      provider: "v8",
      include: ["container/**/*.ts", "worker/**/*.ts"],
      exclude: ["**/*.test.ts", "container/main.ts"],
      reporter: ["text"],
      thresholds: { 100: true, perFile: true },
    },
  },
});
