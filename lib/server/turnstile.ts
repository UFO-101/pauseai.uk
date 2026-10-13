import "server-only";
import { copy } from "@/lib/content/email-your-mp";
import { outsideFetch } from "./outside-fetch";

// Cloudflare Turnstile, checked on the server. Ported from pauseai-website's
// src/lib/server/turnstile-verify.ts. Fails closed: a deploy without a
// secret, or with one of Cloudflare's test secrets, refuses every form
// rather than quietly becoming an open mail relay.

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Cloudflare's dummy secrets (1x…, 2x…, 3x… then zeros), which pass or fail every token. */
const TEST_SECRET = /^[123]x0{10}/;

export type SpamCheck = { drop: true } | { drop: false; message?: string };

function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

async function verifyTurnstile(token: string | undefined, hostname: string): Promise<string | undefined> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (isDev()) return undefined;
    console.error("TURNSTILE_SECRET_KEY is not configured");
    return copy.errors.spamUnavailable;
  }
  if (!isDev() && TEST_SECRET.test(secret)) {
    console.error("TURNSTILE_SECRET_KEY is a Cloudflare test key, refused outside development");
    return copy.errors.spamMisconfigured;
  }
  if (!token) return copy.errors.spamWait;

  try {
    const res = await outsideFetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const result = await res.json();
    if (result?.success !== true) {
      console.warn("Turnstile rejected a submission:", result?.["error-codes"]);
      return copy.errors.spamFailed;
    }
    // A token minted on another host (a deploy preview, say) and replayed
    // here. Only when Turnstile names a different host: a missing field
    // mustn't lock out real senders.
    if (!isDev() && typeof result.hostname === "string" && result.hostname !== hostname) {
      console.warn(`Turnstile token issued for ${result.hostname}, submitted to ${hostname}`);
      return copy.errors.spamFailed;
    }
    return undefined;
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return copy.errors.spamUnreachable;
  }
}

/**
 * The honeypot, then Turnstile. `drop` means pretend it worked, so a bot
 * doesn't learn it was caught.
 */
export async function checkNotSpam(
  { nickname, turnstileToken }: { nickname?: string; turnstileToken?: string },
  hostname: string,
): Promise<SpamCheck> {
  if (nickname) return { drop: true };
  const message = await verifyTurnstile(turnstileToken, hostname);
  return message ? { drop: false, message } : { drop: false };
}
