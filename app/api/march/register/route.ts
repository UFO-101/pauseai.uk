// The march sign-up's endpoint (SignupForm posts to it): checks the name and
// email, then adds the person to the march's Luma event, which emails them
// its confirmation. A route rather than a Server Action: an action's ID
// changes with every build, so a page opened before a deploy couldn't
// register after it, where this address stays put.
import { NextResponse } from "next/server";
import { checkMarchRegistration, type MarchRegisterResult } from "@/lib/march-registration";
import { addLumaGuest } from "@/lib/server/outside-services/luma-guests";

/**
 * The Luma event registrants are added to: "Luma API Testing"
 * (https://luma.com/qry332td), a test event on the PauseAI UK calendar, so the
 * sign-up can be checked end to end on a deploy preview. Every deploy uses it,
 * production too, until it's the march's event.
 */
const MARCH_EVENT_ID = "evt-hfOj1RR5K1gBNEW";

/** The form's honeypot field: hidden from people, filled in by bots that fill in everything. */
const HONEYPOT_FIELD = "website";

/** Answers with a MarchRegisterResult, always 200. The logs leave out the email address. */
export async function POST(request: Request) {
  return NextResponse.json(await register(await request.json().catch(() => null)));
}

async function register(input: unknown): Promise<MarchRegisterResult> {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;

  // A bot is told it worked, so it has no reason to try again differently.
  const honeypot = raw[HONEYPOT_FIELD];
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    console.warn("[march] Honeypot filled in; ignoring the sign-up.");
    return { ok: true };
  }

  const check = checkMarchRegistration(raw);
  if (!check.ok) return { ...check, reason: "invalid" };

  const result = await addLumaGuest(MARCH_EVENT_ID, check.registration);
  switch (result.status) {
    case "added":
      return { ok: true };
    case "skipped":
      console.error("[march] Luma skipped the guest (unsubscribed, removed or blocked on the calendar).");
      break;
    case "not-configured":
      console.error("[march] Can't add the guest to Luma: LUMA_API_KEY not set.");
      break;
    case "failed":
      console.error(`[march] Couldn't add the guest to Luma: ${result.reason}`);
      break;
  }
  return { ok: false, reason: "luma-failed" };
}
