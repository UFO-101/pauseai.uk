// Checking what the march sign-up form sends (app/api/march/register/route.ts).
// It runs on the server, where it counts: the browser's `required` and
// type="email" are only a convenience, and the route can be posted to
// directly.
import { marchSignupCopy } from "@/lib/content/march-signup";

/**
 * A sign-up: the name and email Luma gets, and what else the form asks,
 * kept as a form entry. An optional field left blank is null.
 */
export type MarchRegistration = {
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  postcode: string | null;
  /** The box to hear from us by email and phone. */
  consent: boolean;
  /** The page's utm_source, where the link they followed came from. */
  utmSource: string | null;
};

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
/** Longer than any real phone number, city, postcode or utm_source. */
const MAX_OPTIONAL_LENGTH = 100;
/** Loose: one @, something either side, a dot in the domain, no spaces. Luma checks it properly. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

const text = (input: unknown) => (typeof input === "string" ? input.trim() : "");

/**
 * An optional field as kept: null when blank, and null too when it's too
 * long or has control characters in it, as such a field is worth less than
 * the sign-up, which mustn't fail on it.
 */
function optional(input: unknown): string | null {
  const value = text(input);
  return value && value.length <= MAX_OPTIONAL_LENGTH && !CONTROL_CHARS.test(value) ? value : null;
}

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
  return {
    ok: true,
    registration: {
      name,
      email,
      phone: optional(raw.phone),
      city: optional(raw.city),
      postcode: optional(raw.postcode)?.toUpperCase() ?? null,
      consent: raw.consent === true,
      utmSource: optional(raw.utmSource),
    },
  };
}
