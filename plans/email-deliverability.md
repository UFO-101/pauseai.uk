# Email deliverability: bounces for every kind of email

A bounce is a fact about an address, not about a letter. Every email the site
sends goes through one function, which logs it and refuses addresses we know
are dead; every bounce or complaint, whatever caused it, updates that
address; and each kind of email can react in its own way.

## Tables (one migration)

- `email_sends`: every email we tried to send: `purpose` (`letter`,
  `forwarded-reply`, `staff-login`, `staff-alert`), `letter_id`, `address`,
  `outcome` (`sent`, `refused`, `failed`), the provider's `message_id`.
  Backfilled from `letters.postmark_message_id`, which is then dropped.
- `email_problems`: every bounce and complaint, and every 406 refusal. Never
  changed: `address`, `message_id`, `kind` (`hard`, `soft`, `complaint`),
  `reason`, `can_reset`, `details`.
- `email_blocks`: `address` (primary key) and `problem_id`, the hard bounce or
  complaint that blocked it. A reset deletes the row.
- `letters.status` gains `not_sent`: the MP's address was blocked by the time
  the letter was sent. Kept so staff see it, and it doesn't count towards
  the one-letter-per-campaign rule.

## Sending

`send(email, purpose, letterId?)` (lib/server/email.ts) returns
`{ sent: true; id } | { sent: false; reason: "blocked" | "failed" }` instead
of throwing. It refuses an address in `email_blocks` without asking the
provider, and treats Postmark's 406 (inactive recipient) as a hard bounce it
hadn't heard about: blocks the address, and refuses. Every attempt is a
`email_sends` row. Callers decide what to tell people.

## Webhooks

Postmark's bounce and spam complaint payloads become one shape,
`{ messageId, address, kind, reason, canReset, at }` (Postmark: `SpamComplaint`
→ complaint; a bounce with `Inactive` → hard; else soft). One handler:

1. records it in `email_problems`;
2. for hard and complaint, blocks the address (`email_blocks`) and logs it
   in the audit log as `postmark`;
3. finds the email in `email_sends` and calls its purpose's hook. `letter`:
   marks the letter bounced or complained about (as now), and for a hard
   bounce or complaint, emails staff (`REPLIES_INBOX`), linking to
   `/staff/emails`. The others do nothing.

## The letter form

- The lookup says an MP whose address is blocked can't be reached
  (placeholder copy), as it does for an MP with no email.
- If the address is blocked by the time the letter is sent, the letter is
  kept as `not_sent` and the sender told (placeholder copy).
- Forwarded replies and staff login links to a blocked address are skipped
  and logged.

## Resetting

A staff button, on `/staff/emails` and the politician's page, with a note:
asks Postmark to delete the suppression (`POST
/message-streams/outbound/suppressions/delete`), deletes the
`email_blocks` row, and logs who and why in the audit log. Not offered
for complaints, which Postmark can't reset. A changed MP address starts fresh.

## Staff pages

- `/staff/emails` (in the nav): blocked addresses, filterable by status: the
  address, status, since, reason, whose it is (MP linked to their page), the
  email that caused it (letter), emails refused since, reset. Below: recent
  problems, soft bounces included.
- A politician's page: a warning by their email when it's blocked, with the
  reset.
- The politicians list: a "bouncing" badge on the row, and a filter.
- The letters list: the `not_sent` status, in the filter too.
- The audit log: blocks (`postmark`) and resets.

All new words are placeholders (AGENTS.md).

## Tests

Unit tests for each piece (100% coverage), the fixture Postmark answering the
suppressions call, and storyboard flows: a letter bounces, staff see the
address on `/staff/emails` and the MP's page, the form then says the MP
can't be reached, staff reset it, and the form works again.
