# Request for pauseai.info: emit an "MP email sent" event from the UK email-MP embed

Same pattern as the onboarding embed change (`onboarding_signup_complete`), now for the Email your MP form. For an agent working in the **pauseai.info** repo (`pauseai-website`).

## Why

pauseai.uk runs Google Ads via GTM. "Email your MP" is a primary conversion. The form is an iframe of `https://pauseai.info/embed/uk-email-mp` on `pauseai.uk/campaigns`, and cross-origin iframes are invisible to pauseai.uk, so the embed must tell the parent when an email has been sent.

## What we need

When a user **successfully sends** an MP email (the action is confirmed, not merely a button click), the embed posts one message to its parent:

```ts
if (window.parent !== window) {
  window.parent.postMessage({ event: "mp_email_sent", version: 1 }, "*");
}
```

Requirements:

1. Fire once per successful send, at the point success is confirmed. Not on click, validation failure or failed request.
2. Only when embedded (`window.parent !== window`). Standalone `/uk-email-mp` must not error or post.
3. No personal data in the payload. No name, email, postcode, MP name or message text.
4. Keep the existing resize message unchanged: `{ type: "pauseai-embed-resize", height: number }`. pauseai.uk matches on `type`; the new message matches on `event`.
5. No analytics added inside the embed. pauseai.uk owns the Ads tag and consent.
6. If the flow lets a user send to several MPs or resend, post once per completed send action, not per recipient. Tell us if that assumption is wrong.

## pauseai.uk side (already done)

`app/campaigns/CampaignsClient.tsx` already checks `e.origin === "https://pauseai.info"`. It now pushes `{ event: "mp_email_sent" }` to `dataLayer`, which a GTM Custom Event trigger turns into the Ads conversion.

## Acceptance criteria

1. Sending an email inside the pauseai.uk iframe posts exactly one `{ event: "mp_email_sent", version: 1 }`.
2. Failed or invalid submits post nothing.
3. Standalone page: no errors, no message.
4. Resize messages unchanged.
5. Message documented in the embed docs alongside the resize message (as was done for `docs/ONBOARDING_EMBED.md`).

## How to test

1. Run pauseai.info locally.
2. Load a scratch page with `<iframe src="http://localhost:PORT/embed/uk-email-mp">` and `window.addEventListener("message", e => console.log(e.origin, e.data))`.
3. Complete a send and confirm one `mp_email_sent` log. Trigger a validation error and confirm none.

## Open questions

1. Does the embed send the email itself, or hand off to the user's mail client (`mailto:`)? If it hands off, "sent" cannot be confirmed. In that case fire on the handoff click and say so in the docs, since it inflates conversions slightly.
