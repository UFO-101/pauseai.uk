import "server-only";
import { randomUUID } from "node:crypto";

// Email as MIME, both ways: a message to send by Gmail, which takes the
// whole message rather than its fields, and the messages read back from a
// mailbox, a reply or a bounce. Only as much of MIME as those need.

const CRLF = "\r\n";

/** A file sent with an email: its name, type, and content in base64. */
export type MimeAttachment = { Name: string; ContentType: string; Content: string };

/** An email to write as MIME, in the fields Postmark takes, and its own Message-ID. */
export type MimeEmail = {
  From: string;
  To: string;
  Bcc?: string;
  ReplyTo?: string;
  Subject: string;
  TextBody: string;
  HtmlBody?: string;
  Attachments?: MimeAttachment[];
  /** Without its angle brackets. */
  MessageId: string;
  Date: Date;
};

/** A Message-ID for an email we send, without its angle brackets. */
export function newMessageId(): string {
  return `${randomUUID()}@pauseai.uk`;
}

/** Text for a header, as an RFC 2047 encoded word if it isn't plain ASCII. */
function encodeWord(text: string): string {
  return /^[\x20-\x7e]*$/.test(text) ? text : `=?UTF-8?B?${Buffer.from(text, "utf8").toString("base64")}?=`;
}

/** An address header, with each display name encoded if it needs to be: `"Jane" <jane@example.org>`. */
function encodeAddresses(value: string): string {
  return value.replace(/"([^"]*)"/g, (_, name: string) => {
    const word = encodeWord(name);
    return word === name ? `"${name}"` : word;
  });
}

/** Base64, in lines of 76. */
function base64Lines(content: string): string {
  return content.match(/.{1,76}/g)?.join(CRLF) ?? "";
}

function part(headers: string[], body: string): string {
  return [...headers, "", body].join(CRLF);
}

function multipart(subtype: string, parts: string[]): string {
  const boundary = `=_${randomUUID()}`;
  return part(
    [`Content-Type: multipart/${subtype}; boundary="${boundary}"`],
    parts.map((p) => `--${boundary}${CRLF}${p}${CRLF}`).join("") + `--${boundary}--`,
  );
}

function text(type: string, body: string): string {
  return part(
    [`Content-Type: text/${type}; charset=utf-8`, "Content-Transfer-Encoding: base64"],
    base64Lines(Buffer.from(body.replace(/\r?\n/g, CRLF), "utf8").toString("base64")),
  );
}

/** An email as a MIME message: its text and HTML as alternatives, then its files. */
export function toMime(email: MimeEmail): string {
  const headers = [
    ["From", encodeAddresses(email.From)],
    ["To", encodeAddresses(email.To)],
    ["Bcc", email.Bcc && encodeAddresses(email.Bcc)],
    ["Reply-To", email.ReplyTo && encodeAddresses(email.ReplyTo)],
    ["Subject", encodeWord(email.Subject)],
    ["Date", email.Date.toUTCString()],
    ["Message-ID", `<${email.MessageId}>`],
    ["MIME-Version", "1.0"],
  ].filter((h): h is [string, string] => Boolean(h[1]));
  const bodies = [text("plain", email.TextBody), ...(email.HtmlBody ? [text("html", email.HtmlBody)] : [])];
  const attachments = (email.Attachments ?? []).map((a) =>
    part(
      [
        `Content-Type: ${a.ContentType}; name="${encodeWord(a.Name)}"`,
        `Content-Disposition: attachment; filename="${encodeWord(a.Name)}"`,
        "Content-Transfer-Encoding: base64",
      ],
      base64Lines(a.Content),
    ),
  );
  const body = attachments.length
    ? multipart("mixed", [multipart("alternative", bodies), ...attachments])
    : multipart("alternative", bodies);
  return headers.map(([name, value]) => `${name}: ${value}`).join(CRLF) + CRLF + body + CRLF;
}

/** A part of a message read back: its headers, by lowercased name, and its body, decoded. */
export type MimePart = { headers: Map<string, string>; body: Buffer; parts: MimePart[] };

/** Decodes RFC 2047 encoded words in a header's value. */
export function decodeWords(value: string): string {
  return value
    .replace(/\?=\s+=\?/g, "?==?")
    .replace(/=\?([^?]+)\?([bq])\?([^?]*)\?=/gi, (_, charset: string, encoding: string, data: string) => {
      const bytes =
        encoding.toLowerCase() === "b" ? Buffer.from(data, "base64") : decodeQuotedPrintable(data.replace(/_/g, " "));
      return new TextDecoder(charset.toLowerCase() === "utf8" ? "utf-8" : charset).decode(bytes);
    });
}

function decodeQuotedPrintable(text: string): Buffer {
  const soft = text.replace(/=\r?\n/g, "");
  const bytes: number[] = [];
  for (let i = 0; i < soft.length; i++) {
    const hex = soft[i] === "=" && /^[0-9a-f]{2}$/i.test(soft.slice(i + 1, i + 3)) ? soft.slice(i + 1, i + 3) : "";
    if (hex) {
      bytes.push(parseInt(hex, 16));
      i += 2;
    } else {
      bytes.push(...Buffer.from(soft[i], "utf8"));
    }
  }
  return Buffer.from(bytes);
}

/** The headers of a message or part, unfolded, by lowercased name; the first of each name. */
export function parseHeaders(block: string): Map<string, string> {
  const headers = new Map<string, string>();
  for (const line of block.replace(/\r?\n[ \t]+/g, " ").split(/\r?\n/)) {
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    const name = line.slice(0, colon).trim().toLowerCase();
    if (!headers.has(name)) headers.set(name, line.slice(colon + 1).trim());
  }
  return headers;
}

/** A parameter of a header, such as a Content-Type's boundary or charset. */
export function headerParameter(value: string | undefined, name: string): string | undefined {
  const match = value && new RegExp(`;\\s*${name}\\s*=\\s*(?:"([^"]*)"|([^;\\s]+))`, "i").exec(value);
  return match ? (match[1] ?? match[2]) : undefined;
}

/** A whole message, or one of its parts, parsed: the parts of a multipart, and a message inside one. */
export function parseMime(raw: string): MimePart {
  const split = /\r?\n\r?\n/.exec(raw);
  const headers = parseHeaders(split ? raw.slice(0, split.index) : raw);
  const content = split ? raw.slice(split.index + split[0].length) : "";
  const type = (headers.get("content-type") ?? "text/plain").toLowerCase();
  const boundary = headerParameter(headers.get("content-type"), "boundary");
  if (type.startsWith("multipart/") && boundary) {
    const pieces = content.split(new RegExp(`\\r?\\n?--${boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    const parts = pieces
      .slice(1)
      .filter((piece) => !piece.startsWith("--"))
      .map((piece) => parseMime(piece.replace(/^[ \t]*\r?\n/, "")));
    return { headers, body: Buffer.alloc(0), parts };
  }
  const encoding = (headers.get("content-transfer-encoding") ?? "").toLowerCase();
  const body =
    encoding === "base64"
      ? Buffer.from(content.replace(/\s+/g, ""), "base64")
      : encoding === "quoted-printable"
        ? decodeQuotedPrintable(content)
        : Buffer.from(content, "latin1");
  // A message inside this one, as a bounce carries the one that bounced.
  const inner = type.startsWith("message/rfc822") ? [parseMime(body.toString("latin1"))] : [];
  return { headers, body, parts: inner };
}

/** Every part in a message, itself first, depth first. */
export function allParts(part: MimePart): MimePart[] {
  return [part, ...part.parts.flatMap(allParts)];
}

/** A part's body as text, in its charset. */
export function partText(part: MimePart): string {
  const charset = headerParameter(part.headers.get("content-type"), "charset") ?? "utf-8";
  try {
    return new TextDecoder(charset).decode(part.body);
  } catch {
    return part.body.toString("utf8");
  }
}

/** A message's first part of a type, such as text/plain, that isn't an attachment. */
export function firstOfType(message: MimePart, type: string): MimePart | undefined {
  return allParts(message).find(
    (p) =>
      (p.headers.get("content-type") ?? "text/plain").toLowerCase().startsWith(type) &&
      !(p.headers.get("content-disposition") ?? "").toLowerCase().startsWith("attachment"),
  );
}

/** The Message-IDs in a header such as References, without their angle brackets. */
export function messageIds(value: string | undefined): string[] {
  return [...(value ?? "").matchAll(/<([^<>\s]+)>/g)].map((match) => match[1]);
}

/** The address in a From header, lowercased, and its display name. */
export function fromAddress(value: string | undefined): { address: string; name: string } {
  const decoded = decodeWords(value ?? "");
  const angled = /<([^>]*)>/.exec(decoded);
  const address = (angled ? angled[1] : decoded).trim().toLowerCase();
  const name = angled ? decoded.slice(0, angled.index).trim().replace(/^"|"$/g, "") : "";
  return { address, name };
}
