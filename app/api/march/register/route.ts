// The march sign-up's endpoint (SignupForm posts to it): checks the form,
// adds the person to the march's Luma event, which emails them its
// confirmation, and keeps what they gave as a form entry, whatever Luma said. A route rather than a Server Action: an action's ID
// changes with every build, so a page opened before a deploy couldn't
// register after it, where this address stays put.
import { NextResponse } from "next/server";
import { checkMarchRegistration, type MarchRegisterResult } from "@/lib/march-registration";
import { addFormEntry } from "@/lib/server/form-entries";
import { marchEventId } from "@/lib/server/march-event";
import { addLumaGuest } from "@/lib/server/outside-services/luma-guests";
import { problem } from "@/lib/server/problems";
import { staffCopy } from "@/lib/content/staff-interface";
import { readJsonIfAny } from "@/lib/server/json";

/** The form's honeypot field: hidden from people, filled in by bots that fill in everything. */
const HONEYPOT_FIELD = "website";

/** Answers with a MarchRegisterResult, always 200. The logs leave out the email address. */
export async function POST(request: Request) {
  const body = await readJsonIfAny(request);
  if (body === undefined) problem(staffCopy.problems.logs.badBody("The march form"));
  return NextResponse.json(await register(body ?? null));
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

  const { registration } = check;
  const event = marchEventId();
  const result = await addLumaGuest(event, { name: registration.name, email: registration.email });
  // Kept even when Luma didn't take them: they gave us their details. If it
  // can't be kept, Luma's answer still stands.
  await addFormEntry("march-2026-11", registration, { eventId: event, status: result.status }).then(
    (id) => console.log(`[march] Kept sign-up ${id}: Luma ${result.status}.`),
    (error: unknown) => problem(staffCopy.problems.logs.signUpNotKept, error),
  );
  switch (result.status) {
    case "added":
      return { ok: true };
    case "skipped":
      problem(staffCopy.problems.logs.lumaSkippedGuest);
      break;
    case "not-configured":
      problem(staffCopy.problems.logs.lumaNotConfigured);
      break;
    case "failed":
      // Reported where it failed (addLumaGuest).
      break;
  }
  return { ok: false, reason: "luma-failed" };
}
