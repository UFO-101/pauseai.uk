import "server-only";
import { randomUUID } from "node:crypto";

// Writing email as MIME: a message to send by Gmail, which takes the whole
// message rather than its fields, and one relayed. Only as much of MIME as
// those need; lib/email-parsing/mime.ts reads it.

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
  /** Others, such as In-Reply-To and References, as they're written. */
  Headers?: { Name: string; Value: string }[];
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
    ...(email.Headers ?? []).map((h) => [h.Name, h.Value]),
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

/**
 * The headers of a message that a relay of it keeps, as they came: what
 * says how its body is written, its subject, and the marks of an automatic
 * reply, so responders that follow RFC 3834 don't answer it.
 */
const RELAYED_HEADERS = [
  "mime-version",
  "content-type",
  "content-transfer-encoding",
  "content-disposition",
  "content-language",
  "subject",
  "auto-submitted",
  "precedence",
  "x-autoreply",
  "x-autorespond",
];

/**
 * A message to send on as it is, byte for byte, but for the headers:
 * `headers` (From, To, Message-ID, threading), then those of the original
 * a relay keeps, folded lines and all; every other header of the original,
 * its Cc included, is left out.
 */
export function relayMime(raw: Buffer, headers: [string, string][]): Buffer {
  const text = raw.toString("latin1");
  const split = /\r?\n\r?\n/.exec(text);
  const head = split ? text.slice(0, split.index) : text;
  const body = split ? text.slice(split.index + split[0].length) : "";
  const kept = head
    .split(/\r?\n(?![ \t])/)
    .filter((line) => RELAYED_HEADERS.includes(line.slice(0, line.indexOf(":")).trim().toLowerCase()));
  const ours = headers.map(([name, value]) => `${name}: ${encodeAddresses(value)}`);
  return Buffer.from([...ours, ...kept].join(CRLF) + CRLF + CRLF + body, "latin1");
}
