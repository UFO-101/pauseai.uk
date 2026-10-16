import { existsSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { TEMPLATES } from "./templates";

// Every layout has its drawing tests (tests/browser/render-matrix.ts), one
// file each so they run in parallel. A new layout needs its file.
it.each(TEMPLATES.map((t) => t.id))("layout %s has its render-<layout>.browser.test.ts", (id) => {
  expect(existsSync(join(import.meta.dirname, `render-${id}.browser.test.ts`))).toBe(true);
});
