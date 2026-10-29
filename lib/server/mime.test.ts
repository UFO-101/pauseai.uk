import { describe, expect, it } from "vitest";
import {
  allParts,
  decodeWords,
  firstOfType,
  fromAddress,
  headerParameter,
  messageIds,
  newMessageId,
  parseHeaders,
  parseMime,
  partText,
  toMime,
} from "./mime";

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

describe("reading a message", () => {
  it("decodes encoded words, B and Q, in any charset, joining neighbours", () => {
    expect(decodeWords("=?utf-8?Q?Caf=C3=A9_au_lait?= =?UTF8?B?w6k=?= ok")).toBe("Café au laité ok");
    expect(decodeWords("=?iso-8859-1?q?r=E9ponse?=")).toBe("réponse");
  });

  it("unfolds headers, keeps the first of a name, and skips lines that aren't headers", () => {
    const headers = parseHeaders("Subject: one\r\n two\r\nnot a header\r\nSubject: again\r\nX-Empty:");
    expect(headers.get("subject")).toBe("one two");
    expect(headers.get("x-empty")).toBe("");
    expect(headers.size).toBe(2);
  });

  it("finds a header's parameters, quoted or not", () => {
    expect(headerParameter('multipart/mixed; boundary="a b"', "boundary")).toBe("a b");
    expect(headerParameter("text/plain; charset=iso-8859-1", "charset")).toBe("iso-8859-1");
    expect(headerParameter("text/plain", "charset")).toBeUndefined();
    expect(headerParameter(undefined, "charset")).toBeUndefined();
  });

  it("decodes quoted-printable, with soft line breaks and an = that isn't an escape", () => {
    const part = parseMime(
      "Content-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\nCaf=C3=A9 =\r\nis =ZZ open",
    );
    expect(partText(part)).toBe("Café is =ZZ open");
  });

  it("reads a part with no body, and plain text with no type as text in its charset", () => {
    expect(parseMime("Subject: only headers").body.length).toBe(0);
    const plain = parseMime("Subject: hi\n\nHello");
    expect(partText(plain)).toBe("Hello");
    expect(firstOfType(plain, "text/plain")).toBe(plain);
  });

  it("reads text in a charset it doesn't know as UTF-8", () => {
    expect(partText(parseMime("Content-Type: text/plain; charset=x-unknown\r\n\r\nHello"))).toBe("Hello");
  });

  it("reads a message carried inside another, as a bounce carries the one that bounced", () => {
    const raw = [
      'Content-Type: multipart/report; boundary="b1"',
      "",
      "--b1",
      "Content-Type: text/plain",
      "",
      "It bounced.",
      "--b1",
      "Content-Type: message/rfc822",
      "",
      "Message-ID: <abc@pauseai.uk>",
      "Subject: AI safety",
      "",
      "Dear Ms Placeholder",
      "--b1--",
    ].join("\r\n");
    const parts = allParts(parseMime(raw));
    expect(parts).toHaveLength(4);
    expect(parts[3].headers.get("message-id")).toBe("<abc@pauseai.uk>");
  });

  it("lists the Message-IDs in a header, without their brackets", () => {
    expect(messageIds("<a@x> <b@y>\r\n <c@z>")).toEqual(["a@x", "b@y", "c@z"]);
    expect(messageIds(undefined)).toEqual([]);
  });

  it("reads the address and name in a From header", () => {
    expect(fromAddress("Polly <Polly@Example.org>")).toEqual({ address: "polly@example.org", name: "Polly" });
    expect(fromAddress("MAILER-DAEMON@googlemail.com")).toEqual({ address: "mailer-daemon@googlemail.com", name: "" });
    expect(fromAddress(undefined)).toEqual({ address: "", name: "" });
  });
});
