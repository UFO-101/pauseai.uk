# Request for pauseai.info: emit a "signup complete" event from the onboarding embed

This doc is for an agent (or human) working in the **pauseai.info** repo (`pauseai-website`). It asks for one small change so that pauseai.uk can track Google Ads conversions for onboarding-form signups.

## Why

pauseai.uk is starting Google Ads campaigns. Ads needs to know when a click led to a signup, otherwise it can only optimise for clicks. Google Tag Manager (GTM, container `GTM-K7P36Q7F`) is now installed on pauseai.uk and will fire the Ads conversion tag.

The signup form is not on pauseai.uk. It is an iframe of pauseai.info:

```
https://pauseai.info/embed/onboarding-form/?country=United+Kingdom&bg=FDF8F3
```

Scripts on pauseai.uk cannot see inside a cross-origin iframe, so pauseai.uk has no way to know a signup finished unless the embed tells it. That is the only thing missing.

## What we need

When a user **successfully completes** the onboarding form (the submit succeeded, not merely clicked), the embed posts one message to its parent window:

```ts
window.parent.postMessage({ event: "onboarding_signup_complete" }, "*");
```

Requirements:

1. **Fire once per successful signup**, at the point the backend confirms success. Not on button click, not on validation failure, not on a failed request.
2. **Only when embedded.** Guard with `window.parent !== window`. Do nothing on the standalone pauseai.info page.
3. **Payload contains no personal data.** No name, email, country or form values. Just the event name. Optionally add `{ event, version: 1 }`.
4. **Use the key `event`**, not `height`. The existing height messages use `{ height: number }` and pauseai.uk's listener distinguishes messages by shape. Do not change the height messages.
5. **Target origin.** `"*"` is acceptable because the payload is non-sensitive. If you prefer to restrict it, the parent origins are `https://pauseai.uk` and `https://www.pauseai.uk` (derive from `document.referrer` or an allowlist, and fall back to not sending rather than sending to an unknown origin).
6. **Do not add tracking of your own** (no GA/GTM in the embed for this). pauseai.uk owns the Ads tag and its consent handling.

## How pauseai.uk will consume it (for context, already planned)

`app/OnboardingFormEmbed.tsx` in pauseai.uk already has a `message` listener that checks `event.origin === "https://pauseai.info"` and reads `data.height`. It will be extended:

```ts
if (data?.event === "onboarding_signup_complete") {
  window.dataLayer?.push({ event: "onboarding_signup_complete" });
}
```

GTM then has a Custom Event trigger on `onboarding_signup_complete` that fires the Google Ads conversion tag. The push is only useful if the user accepted analytics, which pauseai.uk's `CookieConsent` handles (GTM is not loaded for users who decline).

## Existing embed contract (do not break)

- Embed already posts `{ height: number }` to the parent as it resizes. pauseai.uk relies on this for iframe height and a load-fallback timer.
- The embed uses `referrerPolicy="no-referrer-when-downgrade"` from the parent so pauseai.info can self-attribute signups to the referring pauseai.uk page from `document.referrer`. Keep that working. See `docs/ONBOARDING_EMBED.md` in pauseai-website.

## Acceptance criteria

1. Completing the form inside the pauseai.uk iframe posts exactly one `{ event: "onboarding_signup_complete" }` message to the parent.
2. A failed submit or validation error posts nothing.
3. Opening `/embed/onboarding-form/` directly (not in an iframe) throws no errors and posts nothing.
4. Existing `{ height }` messages are unchanged.
5. `docs/ONBOARDING_EMBED.md` documents the new message next to the height message.

## How to test

1. Run pauseai.info locally.
2. Load a scratch HTML page with `<iframe src="http://localhost:PORT/embed/onboarding-form/">` and a listener:
   ```html
   <script>
     window.addEventListener("message", (e) => console.log(e.origin, e.data));
   </script>
   ```
3. Submit the form with valid data, and confirm one `{event: "onboarding_signup_complete"}` log after success, plus none after a deliberately invalid submit.

## Out of scope

- Any change to pauseai.uk (handled separately in that repo).
- Google Ads / GTM configuration.
- Tracking other conversions (donations, Luma RSVPs).

## Open questions for whoever picks this up

1. Is there a single success point in the form (e.g. after the final step's API call resolves), or multiple flows (e.g. multi-step, "already signed up")? Should "already signed up" count as a conversion? Suggest **no** to avoid inflating Ads numbers.
2. Are there other consumers of this embed besides pauseai.uk that would be surprised by a new message? An extra message type should be harmless, but worth a grep.
