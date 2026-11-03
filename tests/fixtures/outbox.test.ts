import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fromEml, readOutbox, saveRawToOutbox, saveToOutbox, toEml } from "./outbox";

let dir: string | undefined;
afterEach(() => {
  vi.unstubAllEnvs();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

const email = (n: number) => ({
  From: "a@example.org",
  To: "b@example.org",
  Subject: `Letter ${n}`,
  TextBody: "Hello",
});

describe("the test outbox", () => {
  it("keeps each email, in order, as a mail file", () => {
    dir = join(mkdtempSync(join(tmpdir(), "outbox-")), "inner");
    expect(saveToOutbox(dir, email(1))).toMatch(new RegExp(`^${dir}/\\d+-0*\\d+\\.eml$`));
    saveToOutbox(dir, email(2));
    expect(readOutbox(dir).map((e) => e.Subject)).toEqual(["Letter 1", "Letter 2"]);
    const files = readdirSync(dir);
    expect(files.every((file) => file.endsWith(".eml"))).toBe(true);
    expect(readFileSync(join(dir, files[0]), "utf8")).toMatch(/^From: a@example.org\r\nTo: b@example.org\r\n/);
  });

  it("keeps a whole message as it went, a relay's, and reads its text in base64 and its threading", () => {
    dir = mkdtempSync(join(tmpdir(), "outbox-"));
    const raw = [
      "From: a@example.org",
      "To: b@example.org",
      "Subject: Re: Hi",
      "Message-ID: <relay@pauseai.uk>",
      "In-Reply-To: <copy@pauseai.uk>",
      "References: <copy@pauseai.uk>",
      "Auto-Submitted: auto-replied",
      "Content-Type: multipart/mixed; boundary=b1",
      "",
      "--b1",
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: base64",
      "",
      Buffer.from("Thank you.").toString("base64"),
      "--b1--",
      "",
    ].join("\r\n");
    saveRawToOutbox(dir, Buffer.from(raw));
    expect(readOutbox(dir)).toMatchObject([
      {
        Subject: "Re: Hi",
        MessageId: "<relay@pauseai.uk>",
        InReplyTo: "<copy@pauseai.uk>",
        References: "<copy@pauseai.uk>",
        AutoSubmitted: "auto-replied",
        TextBody: "Thank you.",
      },
    ]);
  });

  it("writes the Message-ID a Gmail send went with", () => {
    expect(fromEml(toEml({ ...email(1), MessageId: "m@pauseai.uk" })).MessageId).toBe("<m@pauseai.uk>");
  });

  it("reads an outbox that isn't there as empty", () => {
    expect(readOutbox(join(tmpdir(), "no-such-outbox"))).toEqual([]);
  });

  it("writes an email with only some fields, its extra headers, and an attachment without a type", () => {
    vi.stubEnv("FIXTURE_NOW", "2026-10-01T09:30:00Z");
    const eml = toEml({ Headers: [{ Name: "X-Extra", Value: "yes" }], Attachments: [{ Name: "a.bin", Content: "" }] });
    expect(eml).toContain("X-Extra: yes\r\n");
    expect(eml).toContain('Content-Type: application/octet-stream; name="a.bin"');
    expect(fromEml(eml)).toEqual({
      From: "",
      To: "",
      Cc: undefined,
      Bcc: undefined,
      ReplyTo: undefined,
      Subject: "",
      Date: "Thu, 01 Oct 2026 09:30:00 GMT",
      TextBody: "",
      HtmlBody: undefined,
      Attachments: [{ Name: "a.bin", ContentType: "application/octet-stream", Content: "" }],
    });
  });

  it("reads a message with no text part or date as having empty ones", () => {
    const email = fromEml("Subject: S\r\n\r\n");
    expect(email.TextBody).toBe("");
    expect(email.Date).toBe("");
  });

  it("reads back what it wrote: addresses, text, HTML and attachments", () => {
    const pdf = Buffer.alloc(300, 7).toString("base64");
    const sent = {
      From: '"Jane Smith via PauseAI" <jane.smith.482913@letters.pauseai.uk>',
      To: "test-mp@parliament.example",
      Bcc: "replies@pauseai.uk",
      ReplyTo: "jane@example.com, jane.smith.482913@letters.pauseai.uk",
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
      Bcc: sent.Bcc,
      ReplyTo: sent.ReplyTo,
      Subject: sent.Subject,
      Date: expect.stringMatching(/ GMT$/),
      TextBody: sent.TextBody,
      HtmlBody: sent.HtmlBody,
      Attachments: sent.Attachments,
    });
  });
});
