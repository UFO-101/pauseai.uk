"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { march } from "@/lib/content/march";
import { marchSignupCopy } from "@/lib/content/march-signup";
import type { MarchRegisterResult } from "../actions";
import { cardMotionProps, type CardMotion } from "./card-motion";
import { m } from "./classes";

const copy = marchSignupCopy.form;

type FormError = { message: string; offerLuma: boolean };

/** A name or email to fix is said as is; anything else offers Luma's own page instead. */
function errorFor(result: Exclude<MarchRegisterResult, { ok: true }> | "unreachable"): FormError {
  if (result === "unreachable" || result.reason === "luma-failed") return { message: copy.failed, offerLuma: true };
  return { message: Object.values(result.errors).join(" "), offerLuma: false };
}

/**
 * The registration form, the register band's first card. `register` is the
 * Server Action (app/(march)/march/actions.ts), which adds the person to the
 * Luma event; once it has, `onRegistered` moves on to the share card.
 * Phone, city, postcode and the mailing list opt-in are asked for, but not sent yet.
 */
export default function SignupForm({
  register,
  onRegistered,
  motion,
  onLeft,
}: {
  register: (input: unknown) => Promise<MarchRegisterResult>;
  onRegistered: () => void;
  motion: CardMotion;
  onLeft: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<FormError | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const value = (name: string) => String(form.get(name)).trim();
    const signup = {
      name: value("name"),
      email: value("email"),
      // Empty for people, filled in by bots. The server checks it.
      website: value("website"),
    };

    setSubmitting(true);
    setError(null);
    let result: MarchRegisterResult | "unreachable";
    try {
      result = await register(signup);
    } catch {
      // The action couldn't be reached: offline, or a deploy in flight.
      result = "unreachable";
    }
    if (result === "unreachable" || !result.ok) {
      setError(errorFor(result));
      setSubmitting(false);
      return;
    }
    onRegistered();
  }

  return (
    <form className={m("signup")} method="post" onSubmit={handleSubmit} {...cardMotionProps(motion, onLeft)}>
      <p className={m("signup-head")}>{copy.head}</p>

      <div className={m("field")}>
        <label htmlFor="name">{copy.name}</label>
        <input id="name" name="name" type="text" autoComplete="name" required data-focus-first />
      </div>

      <div className={m("field")}>
        <label htmlFor="email">{copy.email}</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <div className={m("field")}>
        <label htmlFor="phone">
          {copy.phone} <span className={m("optional")}>{copy.optional}</span>
        </label>
        <input id="phone" name="phone" type="tel" autoComplete="tel" />
        <p className={m("hint")}>{copy.phoneHint}</p>
      </div>

      <div className={m("signup-row")}>
        <div className={m("field")}>
          <label htmlFor="city">
            {copy.city} <span className={m("optional")}>{copy.optional}</span>
          </label>
          <input id="city" name="city" type="text" autoComplete="address-level2" />
          <p className={m("hint")}>{copy.cityHint}</p>
        </div>
        <div className={m("field")}>
          <label htmlFor="postcode">
            {copy.postcode} <span className={m("optional")}>{copy.optional}</span>
          </label>
          <input id="postcode" name="postcode" type="text" autoComplete="postal-code" />
          <p className={m("hint")}>{copy.postcodeHint}</p>
        </div>
      </div>

      <label className={m("check")}>
        <input id="mailingList" name="mailingList" type="checkbox" />
        <span>{copy.mailingList}</span>
      </label>

      {/* The honeypot: off-screen rather than display:none, which some bots
          skip; hidden from screen readers and out of the tab order, under a
          name browsers don't autofill. */}
      <div className={m("signup-hp")} aria-hidden="true">
        <label htmlFor="website">{copy.honeypot}</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className={m("signup-error")} role="alert" hidden={!error}>
        {error && (
          <>
            <p>{error.message}</p>
            {error.offerLuma && (
              <p>
                <a className={m("inline-link")} href={march.lumaUrl} target="_blank" rel="noreferrer">
                  {copy.lumaFallback}
                </a>
              </p>
            )}
          </>
        )}
      </div>

      <button className={m("btn large signup-submit")} type="submit" disabled={submitting}>
        {submitting ? copy.submitting : copy.submit}
      </button>

      <p className={m("signup-privacy")}>
        {copy.privacy}{" "}
        <Link className={m("inline-link")} href="/privacy">
          {copy.privacyLink}
        </Link>
        .
      </p>
    </form>
  );
}
