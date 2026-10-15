import "server-only";
import { copy } from "@/lib/content/email-your-mp";
import { outsideFetch } from "./outside-fetch";

// Cloudflare Turnstile, checked on the server. Ported from pauseai-website's
// src/lib/server/turnstile-verify.ts. With neither key set, it's skipped,
// leaving only the honeypot. With just one of them, or one of Cloudflare's
// test secrets outside development, it fails closed and refuses every form.

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Cloudflare's dummy secrets (1x…, 2x…, 3x… then zeros), which pass or fail every token. */
const TEST_SECRET = /^[123]x0{10}/;

export type SpamCheck = { drop: true } | { drop: false; message?: string };

function isDev(): boolean {
  return process.env.NODE_ENV === "development";
}

async function verifyTurnstile(token: string | undefined): Promise<string | undefined> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret && !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
    if (!isDev()) console.warn("Turnstile keys are not set, so the spam check was skipped");
    return undefined;
  }
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
    // No check of the host Turnstile names: on Netlify, the request's own
    // URL is main--pauseaiuk.netlify.app, not pauseai.uk. The widget's
    // allowed hostnames, set in Cloudflare, say where tokens can be made.
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
export async function checkNotSpam({ nickname, turnstileToken }: { nickname?: string; turnstileToken?: string }): Promise<SpamCheck> {
  if (nickname) return { drop: true };
  const message = await verifyTurnstile(turnstileToken);
  return message ? { drop: false, message } : { drop: false };
}
