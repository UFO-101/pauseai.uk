"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Registering hands off to the share page, where people are asked to bring
// someone with them — the share step is the point of the flow, so the button
// navigates rather than just showing a confirmation in place.
const SHARE_PATH = "/protest/share/";

export default function ProtestSignupForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const value = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement).value.trim();

    const signup = {
      firstName: value("firstName"),
      lastName: value("lastName"),
      email: value("email"),
      phone: value("phone"),
      city: value("city"),
      // An unchecked box is absent from FormData entirely, so read .checked
      // rather than reconstructing the object from form entries.
      mailingList: (form.elements.namedItem("mailingList") as HTMLInputElement).checked,
    };

    setSubmitting(true);

    // TODO: POST to the registrations backend once it exists. Until then the
    // details ride along to the share page rather than being dropped, so
    // wiring up storage later doesn't mean re-asking anyone who signed up.
    try {
      sessionStorage.setItem("protest-signup", JSON.stringify(signup));
    } catch {
      // Private browsing modes can throw on write — not worth blocking
      // registration over.
    }

    router.push(SHARE_PATH);
  }

  return (
    <form className="protest-form" onSubmit={handleSubmit}>
      <div className="protest-form-row">
        <div className="protest-field">
          <label htmlFor="firstName">First name</label>
          <input id="firstName" name="firstName" type="text" autoComplete="given-name" required />
        </div>
        <div className="protest-field">
          <label htmlFor="lastName">Last name</label>
          <input id="lastName" name="lastName" type="text" autoComplete="family-name" required />
        </div>
      </div>

      <div className="protest-field">
        <label htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>

      <div className="protest-form-row">
        <div className="protest-field">
          <label htmlFor="phone">
            Phone number <span className="protest-optional">(optional)</span>
          </label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" />
          <p className="protest-hint">For text updates on the day.</p>
        </div>
        <div className="protest-field">
          <label htmlFor="city">
            City <span className="protest-optional">(optional)</span>
          </label>
          <input id="city" name="city" type="text" autoComplete="address-level2" />
        </div>
      </div>

      <label className="protest-check">
        <input id="mailingList" name="mailingList" type="checkbox" />
        <span>
          Keep me in the loop about future campaigns and developments. (You can
          unsubscribe at any time.)
        </span>
      </label>

      <button className="btn primary large protest-submit" type="submit" disabled={submitting}>
        {submitting ? "Registering…" : "Register"}
      </button>

      <p className="protest-privacy">
        We only use your data to organise and improve our campaigns.
        See our <a href="/privacy/">privacy policy</a>.
      </p>
    </form>
  );
}
