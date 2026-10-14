import "server-only";
import { outsideFetch } from "./outside-fetch";

// The only file that talks to Postmark, over its HTTP API through
// outsideFetch. Not the postmark npm package: it makes its own requests,
// which would skip the fixtures in a Playwright build (docs/testing.md).

const SEND_URL = "https://api.postmarkapp.com/email";

export type Attachment = { Name: string; Content: string; ContentType: string };

export type Email = {
  From: string;
  To: string;
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

/** Sends one email on the transactional stream. Returns Postmark's MessageID. */
export async function sendEmail(email: Email): Promise<string> {
  // The fixture Postmark (DATA_FIXTURES=1) doesn't check the token.
  const token = process.env.POSTMARK_SERVER_TOKEN || (process.env.DATA_FIXTURES === "1" ? "fixture" : "");
  if (!token) throw new PostmarkError("POSTMARK_SERVER_TOKEN is not set");
  const res = await outsideFetch(SEND_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "X-Postmark-Server-Token": token },
    body: JSON.stringify({ ...email, MessageStream: "outbound" }),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok || result.ErrorCode !== 0 || typeof result.MessageID !== "string") {
    throw new PostmarkError(`Postmark refused the email: ${res.status} ${result.ErrorCode ?? ""} ${result.Message ?? ""}`.trim());
  }
  return result.MessageID;
}

/** A display name that can't break out of the From header's quotes. */
export function headerName(name: string): string {
  return name.replace(/["\\\r\n<>]/g, "").trim();
}
