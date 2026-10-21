"use server";

// The march sign-up's Server Action: checks the name and email, then adds
// the person to the march's Luma event, which emails them its confirmation.
import { checkMarchRegistration, marchGuestName, type MarchRegistrationCheck } from "@/lib/march-registration";
import { addLumaGuest } from "@/lib/server/outside-services/luma-guests";

export type MarchRegisterResult =
  | { ok: true }
  | (Extract<MarchRegistrationCheck, { ok: false }> & { reason: "invalid" })
  /** Not on the guest list: Luma failed, skipped them, or isn't set up. */
  | { ok: false; reason: "luma-failed" };

/** The form's honeypot field: hidden from people, filled in by bots that fill in everything. */
const HONEYPOT_FIELD = "website";

/**
 * Called by SignupForm. The event is LUMA_MARCH_EVENT_ID's, so a deploy can
 * point at a test event. The logs leave out the email address.
 */
export async function registerForMarch(input: unknown): Promise<MarchRegisterResult> {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;

  // A bot is told it worked, so it has no reason to try again differently.
  const honeypot = raw[HONEYPOT_FIELD];
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    console.warn("[march] Honeypot filled in; ignoring the sign-up.");
    return { ok: true };
  }

  const check = checkMarchRegistration(raw);
  if (!check.ok) return { ...check, reason: "invalid" };

  const result = await addLumaGuest(process.env.LUMA_MARCH_EVENT_ID ?? "", {
    name: marchGuestName(check.registration),
    email: check.registration.email,
  });
  switch (result.status) {
    case "added":
      return { ok: true };
    case "skipped":
      console.error("[march] Luma skipped the guest (unsubscribed, removed or blocked on the calendar).");
      break;
    case "not-configured":
      console.error(`[march] Can't add the guest to Luma: ${result.missing.join(" and ")} not set.`);
      break;
    case "failed":
      console.error(`[march] Couldn't add the guest to Luma: ${result.reason}`);
      break;
  }
  return { ok: false, reason: "luma-failed" };
}
