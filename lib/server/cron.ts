import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Whether a request comes from our scheduled functions (netlify/functions/),
 * which send CRON_SECRET as a bearer token. Without CRON_SECRET, nothing is.
 */
export function isCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
