// Checking what the march sign-up form sends (app/(march)/march/actions.ts).
// It runs on the server, where it counts: the browser's `required` and
// type="email" are only a convenience, and a Server Action can be posted to
// directly.
import { marchSignupCopy } from "@/lib/content/march-signup";

export type MarchRegistration = { firstName: string; lastName: string; email: string };

export type MarchRegistrationCheck =
  | { ok: true; registration: MarchRegistration }
  | { ok: false; errors: Partial<Record<keyof MarchRegistration, string>> };

const MAX_NAME_LENGTH = 100;
/** The longest address SMTP allows. */
const MAX_EMAIL_LENGTH = 254;
/** Loose: one @, something either side, a dot in the domain, no spaces. Luma checks it properly. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

const text = (input: unknown) => (typeof input === "string" ? input.trim() : "");

export function checkMarchRegistration(input: unknown): MarchRegistrationCheck {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const firstName = text(raw.firstName);
  const lastName = text(raw.lastName);
  const email = text(raw.email);
  const { errors: words } = marchSignupCopy;
  const errors: Partial<Record<keyof MarchRegistration, string>> = {};

  for (const [field, value, label] of [
    ["firstName", firstName, "first name"],
    ["lastName", lastName, "last name"],
  ] as const) {
    if (!value) errors[field] = words.missing(label);
    else if (value.length > MAX_NAME_LENGTH || CONTROL_CHARS.test(value)) errors[field] = words.check(label);
  }

  if (!email) errors.email = words.emailMissing;
  else if (email.length > MAX_EMAIL_LENGTH || CONTROL_CHARS.test(email) || !EMAIL_PATTERN.test(email))
    errors.email = words.emailInvalid;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, registration: { firstName, lastName, email } };
}

/** The one name Luma takes. */
export function marchGuestName({ firstName, lastName }: MarchRegistration): string {
  return `${firstName} ${lastName}`;
}
