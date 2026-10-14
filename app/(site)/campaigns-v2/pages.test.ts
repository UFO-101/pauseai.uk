import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { campaigns } from "@/lib/content/email-your-mp";

// A campaign's page can move on to another's, so each must have one.
describe("campaign pages", () => {
  it("exist for every campaign", () => {
    for (const { slug } of campaigns) expect(existsSync(join(import.meta.dirname, slug, "page.tsx")), slug).toBe(true);
  });
});
