import "server-only";
import { randomUUID } from "node:crypto";
import { saveToOutbox } from "@/tests/fixtures/outbox";
import { outsideFetch } from "./outside-fetch";

// The only file that talks to Postmark, over its HTTP API through
// outsideFetch. Not the postmark npm package: it makes its own requests,
// which would skip the fixtures in a Playwright build (docs/testing.md).

const SEND_URL = "https://api.postmarkapp.com/email";
/** Postmark accepts this token, and answers as if it sent the email. */
const TEST_TOKEN = "POSTMARK_API_TEST";

export type Attachment = { Name: string; Content: string; ContentType: string };

export type Email = {
  From: string;
  To: string;
  Bcc?: string;
  ReplyTo?: string;
  Subject: string;
  TextBody: string;
  HtmlBody?: string;
  Attachments?: Attachment[];
  /** Shown in Postmark's activity log, and sent back with bounces. */
  Metadata?: Record<string, string>;
  Tag?: string;
};

export class PostmarkError extends Error {}

/** Letters to representatives are sent from here, and replies come back to it. */
export function lettersDomain(): string {
  return process.env.LETTERS_MAIL_DOMAIN || "letters.pauseai.uk";
}

/** The site's other email, such as forwarded replies, is sent from here. */
export function notifyDomain(): string {
  return process.env.NOTIFY_MAIL_DOMAIN || "notify.pauseai.uk";
}

/**
 * Sends one email on the transactional stream. Returns Postmark's MessageID.
 *
 * Emails that aren't really sent go to the outbox (tests/fixtures/outbox.ts)
 * instead, and the server log says which file: with DATA_FIXTURES=1, and in
 * the dev server without a real Postmark token. The outbox is OUTBOX_DIR, or
 * tmp/outbox in the dev server.
 */
export async function sendEmail(email: Email): Promise<string> {
  const what = `Email${email.Tag ? ` "${email.Tag}"` : ""} to an address at ${email.To.split("@").pop()}`;
  const body = { ...email, MessageStream: "outbound" };
  const dev = process.env.NODE_ENV === "development";
  const outbox = process.env.OUTBOX_DIR || (dev ? "tmp/outbox" : "");
  const fixtures = process.env.DATA_FIXTURES === "1";
  const token = process.env.POSTMARK_SERVER_TOKEN ?? "";
  const unsent = fixtures ? "DATA_FIXTURES=1" : !token ? "POSTMARK_SERVER_TOKEN isn't set" : token === TEST_TOKEN ? "POSTMARK_SERVER_TOKEN is Postmark's test token" : undefined;
  const saved = () => (outbox ? `Written to ${saveToOutbox(outbox, body)} instead.` : "There's no outbox, so it isn't saved anywhere either.");

  // The dev server, without a real token, doesn't ask Postmark at all.
  if (unsent && !fixtures && dev) {
    log(`${what}: not sent, as ${unsent}. ${saved()}`);
    return randomUUID();
  }
  if (!token && !fixtures) throw new PostmarkError("POSTMARK_SERVER_TOKEN is not set");
  const res = await outsideFetch(SEND_URL, {
    method: "POST",
    // The fixture Postmark (DATA_FIXTURES=1) doesn't check the token.
    headers: { Accept: "application/json", "Content-Type": "application/json", "X-Postmark-Server-Token": token || "fixture" },
    body: JSON.stringify(body),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok || result.ErrorCode !== 0 || typeof result.MessageID !== "string") {
    throw new PostmarkError(`Postmark refused the email: ${res.status} ${result.ErrorCode ?? ""} ${result.Message ?? ""}`.trim());
  }
  log(unsent ? `${what}: not sent, as ${unsent}. ${fixtures ? saved() : ""}`.trim() : `${what}: sent through Postmark, MessageID ${result.MessageID}`);
  return result.MessageID;
}

/** Says in the server log what happened to an email. Quiet in unit tests, which send plenty. */
function log(line: string): void {
  if (process.env.NODE_ENV !== "test") console.info(line);
}

/** A display name that can't break out of the From header's quotes. */
export function headerName(name: string): string {
  return name.replace(/["\\\r\n<>]/g, "").trim();
}
