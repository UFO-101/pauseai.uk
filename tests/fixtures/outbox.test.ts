import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fromEml, readOutbox, recordOutgoing, toEml } from "./outbox";

let dir: string | undefined;
afterEach(() => {
  vi.unstubAllEnvs();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

const email = (n: number) => ({ From: "a@example.org", To: "b@example.org", Subject: `Letter ${n}`, TextBody: "Hello" });

describe("the test outbox", () => {
  it("keeps each email sent through Postmark, in order, as a mail file", () => {
    dir = join(mkdtempSync(join(tmpdir(), "outbox-")), "inner");
    vi.stubEnv("OUTBOX_DIR", dir);
    recordOutgoing("https://api.postmarkapp.com/email", { method: "POST", body: JSON.stringify(email(1)) });
    recordOutgoing("https://api.postmarkapp.com/email", { method: "POST", body: JSON.stringify(email(2)) });
    recordOutgoing("https://api.postcodes.io/postcodes/x", { method: "POST", body: "{}" });
    recordOutgoing("https://api.postmarkapp.com/email");
    expect(readOutbox(dir).map((e) => e.Subject)).toEqual(["Letter 1", "Letter 2"]);
    const files = readdirSync(dir);
    expect(files.every((file) => file.endsWith(".eml"))).toBe(true);
    expect(readFileSync(join(dir, files[0]), "utf8")).toMatch(/^From: a@example.org\r\nTo: b@example.org\r\n/);
  });

  it("keeps nothing without OUTBOX_DIR, and reads an outbox that isn't there as empty", () => {
    vi.stubEnv("OUTBOX_DIR", "");
    recordOutgoing("https://api.postmarkapp.com/email", { body: "{}" });
    expect(readOutbox(join(tmpdir(), "no-such-outbox"))).toEqual([]);
  });

  it("reads back what it wrote: addresses, text, HTML and attachments", () => {
    const pdf = Buffer.alloc(300, 7).toString("base64");
    const sent = {
      From: '"Jane Smith via PauseAI" <reply+abc@letters.pauseai.uk>',
      To: "test-mp@example.org",
      ReplyTo: "jane@example.com, reply+abc@letters.pauseai.uk",
      Subject: "Pause AI — please sign",
      TextBody: "Dear Testy,\n\nPlease sign.\n\nJane Smith\nZZ9 9ZZ",
      HtmlBody: "<p>Dear Testy,</p>",
      MessageStream: "outbound",
      Metadata: { letter: "12" },
      Attachments: [{ Name: "letter.pdf", Content: pdf, ContentType: "application/pdf" }],
    };
    const eml = toEml(sent);
    expect(eml).toContain("X-PM-Metadata-letter: 12\r\n");
    expect(eml).toContain("Please sign.\r\n");
    expect(fromEml(eml)).toEqual({
      From: sent.From,
      To: sent.To,
      Cc: undefined,
      ReplyTo: sent.ReplyTo,
      Subject: sent.Subject,
      TextBody: sent.TextBody,
      HtmlBody: sent.HtmlBody,
      Attachments: sent.Attachments,
    });
  });
});
