import "server-only";
import { randomUUID } from "node:crypto";
import { saveToOutbox } from "@/tests/fixtures/outbox";
import { outsideFetch } from "./outside-fetch";

// The only file that talks to Postmark, over its HTTP API through
// outsideFetch. Not the postmark npm package: it makes its own requests,
// which would skip the fixtures in a Playwright build (docs/testing.md).

const SEND_URL = "https://api.postmarkapp.com/email";
/** The transactional stream, which every email is sent on. */
const STREAM = "outbound";
const UNSUPPRESS_URL = `https://api.postmarkapp.com/message-streams/${STREAM}/suppressions/delete`;
/** Postmark's error for an address on the stream's suppression list. */
const INACTIVE_RECIPIENT = 406;
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

export class PostmarkError extends Error {
  /** Postmark refused because the address is suppressed: it bounced or complained before. */
  readonly inactive: boolean;
  constructor(message: string, code?: number) {
    super(message);
    this.inactive = code === INACTIVE_RECIPIENT;
  }
}

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
  const what = `Email${email.Tag ? ` "${email.Tag}"` : ""} to an address at ${email.To.replace(/^.*@|>$/g, "")}`;
  const body = { ...email, MessageStream: STREAM };
  const dev = process.env.NODE_ENV === "development";
  const outbox = process.env.OUTBOX_DIR || (dev ? "tmp/outbox" : "");
  const fixtures = process.env.DATA_FIXTURES === "1";
  const token = process.env.POSTMARK_SERVER_TOKEN ?? "";
  const unsent = fixtures
    ? "DATA_FIXTURES=1"
    : !token
      ? "POSTMARK_SERVER_TOKEN isn't set"
      : token === TEST_TOKEN
        ? "POSTMARK_SERVER_TOKEN is Postmark's test token"
        : undefined;
  const saved = () =>
    outbox
      ? `Written to ${saveToOutbox(outbox, body)} instead.`
      : "There's no outbox, so it isn't saved anywhere either.";

  // The dev server, without a real token, doesn't ask Postmark at all.
  if (unsent && !fixtures && dev) {
    log(`${what}: not sent, as ${unsent}. ${saved()}`);
    return randomUUID();
  }
  if (!token && !fixtures) throw new PostmarkError("POSTMARK_SERVER_TOKEN is not set");
  const res = await outsideFetch(SEND_URL, {
    method: "POST",
    // The fixture Postmark (DATA_FIXTURES=1) doesn't check the token.
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": token || "fixture",
    },
    body: JSON.stringify(body),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok || result.ErrorCode !== 0 || typeof result.MessageID !== "string") {
    throw new PostmarkError(
      `Postmark refused the email: ${res.status} ${result.ErrorCode ?? ""} ${result.Message ?? ""}`.trim(),
      result.ErrorCode,
    );
  }
  log(
    unsent
      ? `${what}: not sent, as ${unsent}. ${fixtures ? saved() : ""}`.trim()
      : `${what}: sent through Postmark, MessageID ${result.MessageID}`,
  );
  return result.MessageID;
}

/**
 * Takes an address off the stream's suppression list, so Postmark sends to
 * it again. Postmark won't for a spam complaint, and says so only in its
 * answer, which is ignored: if it still refuses, the next email learns that.
 * The dev server, without a real token, doesn't ask.
 */
export async function unsuppress(address: string): Promise<void> {
  const fixtures = process.env.DATA_FIXTURES === "1";
  const token = process.env.POSTMARK_SERVER_TOKEN ?? "";
  if (!fixtures && process.env.NODE_ENV === "development" && (!token || token === TEST_TOKEN)) {
    log(`${address}: not taken off Postmark's suppression list, as there's no real POSTMARK_SERVER_TOKEN.`);
    return;
  }
  if (!token && !fixtures) throw new PostmarkError("POSTMARK_SERVER_TOKEN is not set");
  const res = await outsideFetch(UNSUPPRESS_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": token || "fixture",
    },
    body: JSON.stringify({ Suppressions: [{ EmailAddress: address }] }),
  });
  if (!res.ok) throw new PostmarkError(`Postmark refused to unsuppress the address: ${res.status}`);
}

/** Says in the server log what happened to an email. Quiet in unit tests, which send plenty. */
function log(line: string): void {
  if (process.env.NODE_ENV !== "test") console.info(line);
}

/** A display name that can't break out of the From header's quotes. */
export function headerName(name: string): string {
  return name.replace(/["\\\r\n<>]/g, "").trim();
}
