// Checking what the march sign-up form sends (app/api/march/register/route.ts).
// It runs on the server, where it counts: the browser's `required` and
// type="email" are only a convenience, and the route can be posted to
// directly.
import { marchSignupCopy } from "@/lib/content/march-signup";

/** The UTM tags of the link someone came to the sign-up by, `utm_` left off. */
export const ARRIVAL_TAGS = ["source", "medium", "campaign", "term", "content"] as const;

export type ArrivalTags = Partial<Record<(typeof ARRIVAL_TAGS)[number], string>>;

/** A sign-up: the name and email Luma gets, and the tags of the link it came by, for counting where sign-ups come from. */
export type MarchRegistration = { name: string; email: string; tags: ArrivalTags };

export type MarchRegistrationCheck =
  { ok: true; registration: MarchRegistration } | { ok: false; errors: Partial<Record<"name" | "email", string>> };

/** What registering came to, as app/api/march/register answers it. */
export type MarchRegisterResult =
  | { ok: true }
  | (Extract<MarchRegistrationCheck, { ok: false }> & { reason: "invalid" })
  /** Not on the guest list: Luma failed, skipped them, or isn't set up. */
  | { ok: false; reason: "luma-failed" };

const MAX_NAME_LENGTH = 100;
/** The longest address SMTP allows. */
const MAX_EMAIL_LENGTH = 254;
/** Loose: one @, something either side, a dot in the domain, no spaces. Luma checks it properly. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
const MAX_TAG_LENGTH = 100;

const text = (input: unknown) => (typeof input === "string" ? input.trim() : "");

export function checkMarchRegistration(input: unknown): MarchRegistrationCheck {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const name = text(raw.name);
  const email = text(raw.email);
  const { errors: words } = marchSignupCopy;
  const errors: Partial<Record<"name" | "email", string>> = {};

  if (!name) errors.name = words.missing("full name");
  else if (name.length > MAX_NAME_LENGTH || CONTROL_CHARS.test(name)) errors.name = words.check("full name");

  if (!email) errors.email = words.emailMissing;
  else if (email.length > MAX_EMAIL_LENGTH || CONTROL_CHARS.test(email) || !EMAIL_PATTERN.test(email))
    errors.email = words.emailInvalid;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, registration: { name, email, tags: checkArrivalTags(raw.tags) } };
}

/**
 * The tags the form sent that look like tags: text, short, with no control
 * characters. The rest are left out rather than refused, as they're only for
 * counting, and a sign-up never fails over them.
 */
function checkArrivalTags(input: unknown): ArrivalTags {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const tags: ArrivalTags = {};
  for (const key of ARRIVAL_TAGS) {
    const value = text(raw[key]);
    if (value && value.length <= MAX_TAG_LENGTH && !CONTROL_CHARS.test(value)) tags[key] = value;
  }
  return tags;
}
