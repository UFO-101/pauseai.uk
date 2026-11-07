import { describe, expect, it } from "vitest";
import { allParts, decodeWords, firstOfType, fromAddress, parseMime, partText } from "@/lib/email-parsing/mime";
import { newMessageId, relayMime, toMime } from "./mime";

const EMAIL = {
  From: '"Jo Staff" <jo@pauseai.uk>',
  To: '"Ms Placeholder" <polly@example.org>',
  Subject: "AI safety",
  TextBody: "Dear Ms Placeholder,\nHello.",
  MessageId: "abc@pauseai.uk",
  Date: new Date("2026-11-02T10:00:00Z"),
};

describe("toMime", () => {
  it("writes the text and HTML as alternatives, in base64, with the Message-ID and date", () => {
    const raw = toMime({ ...EMAIL, HtmlBody: "<p>Hello.</p>" });
    const message = parseMime(raw);
    expect(message.headers.get("from")).toBe('"Jo Staff" <jo@pauseai.uk>');
    expect(message.headers.get("message-id")).toBe("<abc@pauseai.uk>");
    expect(message.headers.get("date")).toBe("Mon, 02 Nov 2026 10:00:00 GMT");
    expect(message.headers.has("bcc")).toBe(false);
    expect(message.headers.get("content-type")).toMatch(/^multipart\/alternative/);
    expect(partText(firstOfType(message, "text/plain")!)).toBe("Dear Ms Placeholder,\r\nHello.");
    expect(partText(firstOfType(message, "text/html")!)).toBe("<p>Hello.</p>");
  });

  it("encodes names and a subject that aren't plain ASCII, and carries files after the text", () => {
    const raw = toMime({
      ...EMAIL,
      From: '"Jó Staff" <jo@pauseai.uk>',
      Bcc: "jo@pauseai.uk",
      ReplyTo: '"Jo" <jo@pauseai.uk>',
      Subject: "Sûreté de l'IA",
      TextBody: "",
      Attachments: [
        { Name: "brief.pdf", ContentType: "application/pdf", Content: Buffer.from("PDF").toString("base64") },
      ],
    });
    expect(raw).toContain("From: =?UTF-8?B?");
    expect(raw).toContain('Reply-To: "Jo" <jo@pauseai.uk>');
    const message = parseMime(raw);
    expect(decodeWords(message.headers.get("subject")!)).toBe("Sûreté de l'IA");
    expect(fromAddress(message.headers.get("from"))).toEqual({ address: "jo@pauseai.uk", name: "Jó Staff" });
    expect(message.headers.get("content-type")).toMatch(/^multipart\/mixed/);
    const file = allParts(message).find((p) => p.headers.get("content-disposition")?.startsWith("attachment"))!;
    expect(file.body.toString()).toBe("PDF");
    expect(firstOfType(message, "application/pdf")).toBeUndefined();
    expect(partText(firstOfType(message, "text/plain")!)).toBe("");
  });

  it("makes a new Message-ID each time, at pauseai.uk", () => {
    expect(newMessageId()).toMatch(/^[0-9a-f-]{36}@pauseai\.uk$/);
    expect(newMessageId()).not.toBe(newMessageId());
  });
});

describe("toMime's other headers", () => {
  it("writes them as given, before the MIME version", () => {
    const raw = toMime({ ...EMAIL, Headers: [{ Name: "In-Reply-To", Value: "<x@pauseai.uk>" }] });
    expect(parseMime(raw).headers.get("in-reply-to")).toBe("<x@pauseai.uk>");
  });
});

describe("relayMime", () => {
  const ORIGINAL = [
    "Received: from mx",
    "From: Office <office@parliament.uk>",
    "To: proxy@example.org",
    "Cc: someone@parliament.uk",
    "Subject: Re: Pause",
    "Message-ID: <theirs@parliament.uk>",
    "Auto-Submitted: auto-replied",
    "Content-Type: multipart/mixed;",
    '\tboundary="b1"',
    "MIME-Version: 1.0",
    "",
    "--b1",
    "Content-Type: text/plain",
    "",
    "Caf\xe9",
    "--b1--",
  ].join("\r\n");

  it("keeps the body byte for byte and the headers that say how it's written, putting ours first", () => {
    const relayed = relayMime(Buffer.from(ORIGINAL, "latin1"), [
      ["From", '"Zoë (via PauseAI)" <letters+zoe@example.org>'],
      ["To", "jane@example.com"],
      ["Message-ID", "<ours@pauseai.uk>"],
    ]).toString("latin1");
    const [head, body] = [relayed.slice(0, relayed.indexOf("\r\n\r\n")), relayed.slice(relayed.indexOf("\r\n\r\n"))];
    expect(body).toBe(ORIGINAL.slice(ORIGINAL.indexOf("\r\n\r\n")));
    expect(head.split("\r\n")).toEqual([
      "From: =?UTF-8?B?Wm/DqyAodmlhIFBhdXNlQUkp?= <letters+zoe@example.org>",
      "To: jane@example.com",
      "Message-ID: <ours@pauseai.uk>",
      "Subject: Re: Pause",
      "Auto-Submitted: auto-replied",
      "Content-Type: multipart/mixed;",
      '\tboundary="b1"',
      "MIME-Version: 1.0",
    ]);
  });

  it("relays a message with no body as headers alone", () => {
    expect(relayMime(Buffer.from("Subject: Hi"), [["To", "a@example.org"]]).toString()).toBe(
      "To: a@example.org\r\nSubject: Hi\r\n\r\n",
    );
  });
});
