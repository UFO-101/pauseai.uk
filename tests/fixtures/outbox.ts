// Emails that aren't really sent, because DATA_FIXTURES=1 or, in the dev
// server, Postmark has no real token, are written to a mail file (.eml) in
// the outbox instead (lib/server/postmark.ts), so a person can open them in a
// mail app or a text editor, and a Playwright test can read them: the
// letter, its attachments, a forwarded reply. Test-only plumbing: there's no
// route or table for it.
import { randomUUID } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { now } from "@/lib/now";

/** An email in the outbox, with the fields Postmark was sent. */
export type OutboxEmail = {
  From: string;
  To: string;
  Cc?: string;
  Bcc?: string;
  ReplyTo?: string;
  Subject: string;
  /** When it was sent: the fixed clock's time in a fixture build (lib/now.ts). */
  Date: string;
  TextBody: string;
  HtmlBody?: string;
  Attachments: { Name: string; ContentType: string; Content: string }[];
};

type PostmarkEmail = Partial<Omit<OutboxEmail, "Attachments" | "Date">> & {
  Tag?: string;
  MessageStream?: string;
  Metadata?: Record<string, string>;
  Headers?: { Name: string; Value: string }[];
  Attachments?: { Name: string; Content: string; ContentType?: string }[];
};

const CRLF = "\r\n";

let count = 0;

/** Saves an email, as Postmark would have been sent it, in the outbox `dir`. Returns the file's path. */
export function saveToOutbox(dir: string, email: PostmarkEmail): string {
  mkdirSync(dir, { recursive: true });
  // Sortable by when they were sent.
  const file = join(dir, `${Date.now()}-${String(++count).padStart(4, "0")}.eml`);
  writeFileSync(file, toEml(email));
  return file;
}

/** Every email in the outbox, oldest first. */
export function readOutbox(dir: string): OutboxEmail[] {
  let files: string[];
  try {
    files = readdirSync(dir)
      .filter((file) => file.endsWith(".eml"))
      .sort();
  } catch {
    return [];
  }
  return files.map((file) => fromEml(readFileSync(join(dir, file), "utf8")));
}

/**
 * A Postmark email as a MIME message. Headers and text are left as UTF-8
 * (8bit), not encoded, so the file stays readable.
 */
export function toEml(email: PostmarkEmail): string {
  const headers = [
    ["From", email.From],
    ["To", email.To],
    ["Cc", email.Cc],
    ["Bcc", email.Bcc],
    ["Reply-To", email.ReplyTo],
    ["Subject", email.Subject],
    ["Date", now().toUTCString()],
    ["X-PM-Tag", email.Tag],
    ["X-PM-Message-Stream", email.MessageStream],
    ...Object.entries(email.Metadata ?? {}).map(([name, value]) => [`X-PM-Metadata-${name}`, value]),
    ...(email.Headers ?? []).map((h) => [h.Name, h.Value]),
    ["MIME-Version", "1.0"],
  ].filter((h): h is [string, string] => h[1] !== undefined && h[1] !== "");

  const text = (type: string, body: string) =>
    part(
      [`Content-Type: text/${type}; charset=utf-8`, "Content-Transfer-Encoding: 8bit"],
      body.replace(/\r?\n/g, CRLF),
    );
  const bodies = [text("plain", email.TextBody ?? ""), ...(email.HtmlBody ? [text("html", email.HtmlBody)] : [])];
  const attachments = (email.Attachments ?? []).map((a) =>
    part(
      [
        `Content-Type: ${a.ContentType ?? "application/octet-stream"}; name="${a.Name}"`,
        `Content-Disposition: attachment; filename="${a.Name}"`,
        "Content-Transfer-Encoding: base64",
      ],
      a.Content.match(/.{1,76}/g)?.join(CRLF) ?? "",
    ),
  );
  const body = multipart("mixed", [multipart("alternative", bodies), ...attachments]);
  return headers.map(([name, value]) => `${name}: ${value}`).join(CRLF) + CRLF + body + CRLF;
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

/** Reads back a message written by toEml. */
export function fromEml(eml: string): OutboxEmail {
  const all = leaves(eml);
  const message = all[0];
  const body = (type: string) =>
    all
      .find((p) => p.headers.get("content-type")?.startsWith(`text/${type}`) && !p.headers.has("content-disposition"))
      ?.body.replace(/\r\n/g, "\n");
  const header = (name: string) => message.headers.get(name.toLowerCase());
  return {
    From: header("From") ?? "",
    To: header("To") ?? "",
    Cc: header("Cc"),
    Bcc: header("Bcc"),
    ReplyTo: header("Reply-To"),
    Subject: header("Subject") ?? "",
    Date: header("Date") ?? "",
    TextBody: body("plain") ?? "",
    HtmlBody: body("html"),
    Attachments: all
      .filter((p) => p.headers.get("content-disposition")?.startsWith("attachment"))
      .map((p) => ({
        Name: p.headers.get("content-disposition")!.match(/filename="([^"]*)"/)![1],
        ContentType: p.headers.get("content-type")!.split(";")[0],
        Content: p.body.replace(/\r\n/g, ""),
      })),
  };
}

type Part = { headers: Map<string, string>; body: string };

/** The message's own headers first, then every non-multipart part in it. */
function leaves(raw: string): Part[] {
  const split = raw.indexOf(CRLF + CRLF);
  const headers = new Map<string, string>();
  for (const line of raw
    .slice(0, split)
    .replace(/\r\n[ \t]/g, " ")
    .split(CRLF)) {
    const colon = line.indexOf(":");
    headers.set(line.slice(0, colon).toLowerCase(), line.slice(colon + 1).trim());
  }
  const part = { headers, body: raw.slice(split + 4) };
  const boundary = headers.get("content-type")?.match(/boundary="([^"]+)"/)?.[1];
  if (!boundary) return [part];
  const inner = part.body
    .split(`--${boundary}`)
    .slice(1, -1)
    .map((p) => p.slice(2, -2));
  return [part, ...inner.flatMap(leaves)];
}
