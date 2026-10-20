# Domain concepts

The things the site's features are built from, and how far each is
generalised. A new feature should use these, or grow one, rather than make
its own: a new kind of email is a new purpose of the one email concept, not
a second email system. The features themselves are listed in the README;
where code goes and how it's written is in `docs/code-structure.md`.

Each section says what the concept is, where it lives, how to add another
of its kind, and what it doesn't cover yet.

## Politicians

Anyone we campaign at: MPs, peers, MSPs, members of the Senedd and the
Northern Ireland Assembly, and others (`HOUSES` in
`lib/server/politicians.ts`; the `politicians` table). Each has a house, a
name and salutation, a constituency if they have one, a party, an email if
we know it, and whether they're still sitting. One who leaves is marked as
no longer sitting, never deleted, so their history stays.

Where they come from:

- **MPs** are copied nightly from Airtable, which the policy team keeps,
  keyed by Airtable's record ID (`lib/server/mp-sync.ts`). A sync that
  would change more than 20 at once is held for staff to apply or discard.
  A nightly check compares them with Parliament's Members API and reports
  differences, changing nothing (`lib/server/mp-check.ts`).
- **Other signers**, such as peers, were added once from Airtable's
  signatory list (`lib/server/signatory-import.ts`). Staff can edit a
  politician's details, but not add one.
- **Test MPs** are fixed, each found by a test postcode (`lib/test-mps.json`,
  ZZ99Z\*) and each standing for one case: an ordinary MP, one who has
  signed, one with no email, one whose email bounces. A new case that a
  person would see gets a new test MP.

Only a sitting MP in the Commons is found by postcode. Writing to anyone
else would need a way to find them (a region for an MSP, a list for peers).

## Campaigns

One thing we ask politicians to do: sign the letter to the PM, come to the
Sobel bill's debate (`campaigns` in `lib/content/email-your-mp.ts`). Each is
keyed by its slug, which its page's URL, its letters and its statuses all
use. The list is in priority order: a person writing to their MP is shown
the first campaign that MP hasn't done. So the last campaign is one nobody
has done, and there's always one to move on to.

A campaign has its letter, subject and attachments, and, if it can be done,
the status that means it is. A new campaign is an entry in that list, its
page in `app/(site)/campaigns/<slug>/`, and a link in the nav.

Campaigns only target politicians, through letters.

## Campaign statuses

What a politician has done for a campaign (`campaign_statuses`): one row per
politician per campaign, with a status, a date, a note, and who set it. The
only status so far is `signed`.

Who set it decides who may change it. Staff set statuses by hand for the
campaigns they track (`trackedCampaigns`). An import owns the statuses it
sets: the ControlAI import sets the Sobel bill's from ControlAI's letter,
marked `updated_by` `controlai`, and changes or removes only those
(`lib/server/controlai-import.ts`). A new outside source of statuses works
the same way, with its own `updated_by`.

## Letters

One person's email to one politician for one campaign (`letters`). It's
sent from an address of its own on `letters.pauseai.uk`, so a reply to it
comes back to us, matched to the letter by that address, and is forwarded
to the sender and the policy team. The letter's text isn't kept: the only
copy is the one Bcc'd to `REPLIES_INBOX`.

A letter has a status (`sending`, `sent`, `not_sent`, `bounced`,
`spam_complaint`) and a log of everything that happened to it
(`letter_events`), including replies and automatic replies. Each sender
email can send one letter per campaign, except to a test MP.

## Senders, and people generally

Not a concept yet. The person who wrote a letter is columns on that letter
(`sender_name`, `sender_email`, `sender_address`, `sender_postcode`,
`contact_consent`), so someone who writes twice is two unrelated rows, and
their consent is given per letter. Staff are an email address and nothing
more.

When the site needs to know a person across features (a supporter mailing
list, consent that holds until withdrawn, someone's history of letters), it
needs a people table keyed by their lowercased email, which letters and
anything else about them point at. Email addresses are already handled that
way by the email concept below.

## Email

Everything the site sends, to anyone (`lib/server/email.ts`). Every email
goes through `send()` with its purpose: `letter`, `forwarded-reply`,
`staff-login` or `staff-alert`. Each try is logged (`email_sends`): when,
why, to whom, and whether it went.

When an email bounces or its recipient marks it as spam, the problem is
recorded against the address (`email_problems`). A hard bounce or a
complaint blocks the address (`email_blocks`), and `send()` won't send to a
blocked address, for any purpose. Staff see blocked addresses at
`/staff/blocked-addresses` and on the politician's page, and can unblock a
bounced one, which asks Postmark to send to it again. A complaint can't be
unblocked.

What a bounce means depends on the email's purpose, so each purpose can
have a hook (`lib/server/delivery-problems.ts`): a bounced letter is marked
and staff are emailed. A purpose without a hook needs nothing beyond the
block.

A new kind of email is a new purpose: add it to `Purpose` and to the
`email_sends` CHECK in a migration, and a hook if a bounce should change
anything. If the email is about one record, as a letter is, `email_sends`
needs a column pointing at that kind of record, as `letter_id` does.

Not covered yet: unsubscribing, which mail to supporters would need, and
which would block an address for some purposes but not others.

## Imports

A job that copies data in from outside: the MP sync, the check against
Parliament, the ControlAI letter, the signatory import (`IMPORT_JOBS` in
`lib/import-runs.ts`). Each runs nightly or when staff press its button, and
every run is recorded (`import_runs`): when, who started it (`nightly` or a
staff email), how it ended, why it failed, and the job's own account of
what it found. A run can be held for staff to decide on, as a large MP sync
is. `/staff/import-data` shows each job's newest run, `/staff/import-history`
all of them.

A new job is a name in `IMPORT_JOBS` and the `import_runs` CHECK, a result
type, a function that records its run, a box on the import page, and a
scheduled function if it runs nightly.

## The audit log

Every change made by staff, or by something acting on its own, records who,
what and the details (`audit_log`, `lib/server/audit.ts`). The actor is a
staff email, or the name of what did it: `sync`, `controlai`, `postmark`.
Staff read it at `/staff/audit-log`. A new kind of change logs itself the
same way, inside the same transaction as the change.

## Staff

Anyone with a pauseai.uk email address. They log in with a link sent to
that address, and a session lasts a week (`lib/server/staff-auth.ts`). There
are no roles: every staff member can do everything.

## The public site's content

The rest of the site is content more than data: people's stories, local
groups and their pages, press coverage, blog posts, the board
(`lib/content/`). Events are the exception: Luma's calendar is the source
of truth, read live, and the site keeps no copy.
