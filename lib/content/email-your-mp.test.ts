import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { campaigns, copy } from "./email-your-mp";

describe("Email your MP campaigns", () => {
  it("have unique slugs that work in a URL", () => {
    const slugs = campaigns.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  it("attach PDFs that exist, with thumbnails", () => {
    for (const { file, thumbnail } of campaigns.flatMap((c) => c.attachments)) {
      expect(existsSync(join(process.cwd(), "public/pdfs", file)), file).toBe(true);
      expect(existsSync(join(process.cwd(), "public/pdfs", thumbnail)), thumbnail).toBe(true);
    }
  });

  it("puts the MP's details into the form's messages", () => {
    expect(copy.lookup.mpOf("Hackney North")).toContain("Hackney North");
    expect(copy.form.confirmPrompt("Jane MP")).toContain("Jane MP");
    expect(copy.form.sent("Jane MP")).toContain("Jane MP");
    expect(copy.forwardedReply.subject("Re: AI")).toContain("Re: AI");
    expect(copy.forwardedReply.note("Jane MP", "Jane Smith")).toContain("Jane MP");
  });
});
