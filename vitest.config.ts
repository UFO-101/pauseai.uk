import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    // tests/ is the Playwright suite (visual and behaviour); Vitest's own
    // tests live next to the code they cover, in lib/ and app/.
    exclude: ["**/node_modules/**", "**/tests/**"],
  },
});
