import "server-only";
import { staffCopy } from "@/lib/content/staff-interface";
import { problem } from "@/lib/server/problems";

// Reading a message from a mailbox, a reply or a bounce: its MIME parts and
// headers, and its text. Only as much of MIME as those need.

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

/**
 * Bytes as text, in the charset a Content-Type names. Some mail's bytes aren't
 * valid in the charset it names, so those are read a byte to a character.
 */
export function decodedText(body: Buffer, contentType: string | undefined): string {
  const charset = headerParameter(contentType, "charset") ?? "utf-8";
  let text: string;
  try {
    text = new TextDecoder(charset).decode(body);
  } catch (error) {
    problem(staffCopy.problems.anywhere.charsetUnknown(charset), error);
    text = body.toString("utf8");
  }
  return text.includes("\uFFFD") ? body.toString("latin1") : text;
}

/** A part's body as text, in its charset. */
export function partText(part: MimePart): string {
  return decodedText(part.body, part.headers.get("content-type"));
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

/** A header's text, decoded; blank if the message hasn't one. */
export function headerText(headers: Map<string, string>, name: string): string {
  return decodeWords(headers.get(name) ?? "");
}

/** The entities mail's HTML names, beyond its numbered ones. */
const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  bull: "•",
  euro: "€",
  gt: ">",
  hellip: "…",
  ldquo: "“",
  lsquo: "‘",
  lt: "<",
  mdash: "—",
  nbsp: "\u00a0",
  ndash: "–",
  pound: "£",
  quot: '"',
  rdquo: "”",
  rsquo: "’",
};

/** Some text with HTML's entities as characters: one it doesn't know stays as it is. */
function entitiesRead(text: string): string {
  return text.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (entity, decimal, hex, name) => {
    if (decimal) return String.fromCodePoint(Number(decimal));
    if (hex) return String.fromCodePoint(parseInt(hex, 16));
    return HTML_ENTITIES[name] ?? entity;
  });
}

/** Some HTML's text: its source's wrapping and its tags gone, a blank line between paragraphs, a line for each other break. */
function tagsGone(html: string): string {
  const lines = html
    .replace(/\s+/g, " ")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<\/(p|h\d)>/gi, "\n\n")
    .replace(/<br\s*\/?>|<\/(div|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return entitiesRead(lines).replace(/ *\n */g, "\n");
}

/** An HTML part's text, what's in a blockquote marked with "> " as plain text quotes it. */
function htmlText(html: string): string {
  let depth = 0;
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(head|style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .split(/(<\/?blockquote\b[^>]*>)/i)
    .map((part) => {
      if (/^<blockquote/i.test(part)) {
        depth++;
        return "\n";
      }
      if (/^<\/blockquote/i.test(part)) {
        depth--;
        return "\n";
      }
      const text = tagsGone(part);
      return depth > 0 ? text.replace(/^/gm, "> ") : text;
    })
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** A message's whole text, the mail it quotes included: its plain text if it has one, else its HTML's; empty if neither. */
export function wholeTextOf(message: MimePart): string {
  const plain = firstOfType(message, "text/plain");
  if (plain) return partText(plain).replace(/\r\n/g, "\n").trim();
  const html = firstOfType(message, "text/html");
  return html ? htmlText(partText(html)) : "";
}

/** Some HTML's text, as a message of only HTML is read. */
export function htmlAsText(html: string): string {
  return wholeTextOf(parseMime(`Content-Type: text/html; charset=utf-8\r\n\r\n${html}`));
}
