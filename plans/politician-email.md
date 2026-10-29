# Email to politicians

Mailings to politicians are sent by Gmail, and their threads read back
into `/staff`. One step is left, a small pull request.

## Hard-code the policy inbox

Everything sent to `POLICY_INBOX` is about politicians: copies of
supporters' letters, MPs' replies and bounce alerts. Its address,
policy@pauseai.uk, is no secret: it's on the letter's PDF and is
`site.policyEmail` in `lib/content/site.ts`. The code uses that
everywhere, fixture builds too, as their email goes to the outbox.
`LETTERS_MAIL_DOMAIN` and `NOTIFY_MAIL_DOMAIN` only ever hold their
defaults, so they become constants too. `TEST_MP_EMAIL` stays, as a
developer points it at their own inbox. Then delete `POLICY_INBOX`,
`REPLIES_INBOX` and the two domains from Netlify's settings.

## Not in this plan

A custom sentence or PDF for each person, open tracking, follow-up
emails, recording what a reply said, mailings larger than Gmail's daily
limit, journalists, and limiting who can send from whose Gmail.

## Open questions

1. Should there be a shared account as well as each person's own? It
   would be a new Google account, as the policy@ group has no mailbox.
