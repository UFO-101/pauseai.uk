import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { campaigns } from "@/lib/content/email-your-mp";

// A campaign's page can move on to another's, and goes on to writing the
// letter, its preview and then "sent", so each campaign must have all four.
describe("campaign pages", () => {
  it("exist for every campaign, with its preview and sent pages", () => {
    for (const { slug } of campaigns) {
      for (const page of ["page.tsx", "write/page.tsx", "preview/page.tsx", "sent/page.tsx"])
        expect(existsSync(join(import.meta.dirname, slug, page)), `${slug}/${page}`).toBe(true);
    }
  });
});
