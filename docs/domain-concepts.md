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

## Supporters

One row per person we know of (`supporters`), tied to each record about
them in a source by `supporter_links`: a Luma user (`luma_user_id`) or a
letter (`letter_id`), matched by trimmed, lowercased email and nothing
more, so `jane+luma@` and `jane@` are two people. The supporter holds no
name, email, phone or place of its own: those come from the linked
records, newest first. `linkSupporters()` (`lib/server/supporters.ts`)
only adds links, runs at the end of each Luma import and when a letter is
kept, and is set-based, so running it again does nothing.

Each source (`lib/server/supporter-sources.ts`) gives three views in one
shape, made in the migrations: `supporter_source_<name>` (`source_id`,
`email`, `name`, `seen_at`) for the matcher, `supporter_activity_<name>`
(`source_id`, `at`, `kind`, `title`, `detail`, `href`) for the history,
and `supporter_contact_<name>` (`source_id`, `at`, `phone`, `postcode`,
`latitude`, `longitude`) for contact details and places.
`supporter_identity`, `supporter_activity` and `supporter_contact` union
them by supporter, and `supporters_summary` is one row per supporter for
the list. Only staff with the `supporters` permission see them
(`/staff/supporters`), and each viewing of a supporter's page is an audit
log entry.

Where they come from:

- **Luma.** The hourly import (`lib/server/luma-import.ts`) copies every
  public event on our calendar into `luma_events`, each registered guest
  into `luma_guests` (phone, a postcode answer, `utm_source`; never Luma's
  invited-only rows) and every Luma user into `luma_people`, with when
  they joined the calendar as a contact. Luma's own IDs are the keys, and
  only the import writes these tables. The site's events pages still read
  Luma live.
- **Letters.** The sender of each letter (`sender_name`, `sender_email`,
  `sender_postcode`, `contact_consent`), still columns on the letter, now
  linked to a supporter.

**Erasure.** When someone asks to be forgotten, staff erase the supporter
from their page (`lib/server/erasure.ts`), under the request's reference.
For each source, what that source holds goes: a letter with its events
and the copies of replies forwarded to the sender; a Luma user with their
registrations and contact. What stays is what exists to stop us mailing
the address: `email_problems`,
`email_blocks` and `opt_outs`. The Luma user's ID goes in `luma_erased`,
which the import skips, so they never come back; a new Luma account later
is a new supporter. The audit log entry carries the supporter's ID and the
reference, never a name or address. Luma's own records, and the policy
team's copy of each letter's sender in Airtable ("Web form emails"),
aren't reached from here: an erasure has to go there by hand
(`docs/data-protection.md`).

A new source is a table of its own, a column and a widened `CHECK` on
`supporter_links`, its three views and its arms of the union views, a
badge, and its part of erasure.

## Opt-outs

Each time an address opted out of a mailing list, and when it opted back
in, if it has (`opt_outs`, `lib/server/opt-outs.ts`). Keyed by address,
not supporter, because an unsubscribe can arrive before we know whose
address it is; the supporter pages join it to every address a supporter
has. An address is opted out of a list while it has an open row, one at
most per list. The only list so far is `luma-calendar`, the calendar's
emails, told to us by Luma's `calendar.person.unsubscribed` webhook
(`/api/luma/webhook`, `lib/server/luma-webhooks.ts`), keyed by Luma's
`Webhook-Id` so a redelivery changes nothing; `calendar.person.subscribed`
closes the row. Luma doesn't say whether it was an unsubscribe, a block or
a spam report, and keeps no history, so only opt-outs after the webhook was
set up are known.

Nothing reads `opt_outs` to stop email yet. When the site mails
supporters, each purpose names the lists that stop it, and `send()` checks
them as it checks `email_blocks`. A new list is a name in the `CHECK`s on
`list` and `source`, and whatever records it.

## Email

Everything the site sends, to anyone (`lib/server/email.ts`). Every email
goes through `send()` with its purpose: `letter`, `forwarded-reply`,
`staff-login` or `staff-alert`. Each try is logged (`email_sends`): when,
why, to whom, and whether it went.

When an email bounces or its recipient marks it as spam, the problem is
recorded against the address (`email_problems`). A hard bounce or a
complaint blocks the address (`email_blocks`), and `send()` won't send to a
blocked address, for any purpose. Staff see blocked addresses at
`/staff/blocked-emails` and on the politician's page, and can unblock a
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

Not covered yet: mail to supporters, which would have to honour their
opt-outs ("Opt-outs", above) as well as the blocks here.

## Imports

A job that copies data in from outside: the MP sync, the check against
Parliament, the ControlAI letter, the signatory import, the Luma import
(`IMPORT_JOBS` in `lib/import-runs.ts`). Each runs on a schedule or when
staff press its button, and
every run is recorded (`import_runs`): when, who started it (`nightly` or a
staff email), how it ended, why it failed, and the job's own account of
what it found. A run can be held for staff to decide on, as a large MP sync
is. `/staff/import-data` shows each job's newest run, `/staff/import-history`
all of them.

A new job is a name in `IMPORT_JOBS` and the `import_runs` CHECK, a result
type, a function that records its run, a box on the import page, and a
scheduled function if it runs on a schedule. A job that has more to do
than a run allows, as the Luma import has, keeps its place and says in
its result what's left.

## The audit log

Every change made by staff, or by something acting on its own, records who,
what and the details (`audit_log`, `lib/server/audit.ts`). The actor is a
staff email, or the name of what did it: `sync`, `controlai`, `postmark`.
Staff read it at `/staff/audit-log`. A new kind of change logs itself the
same way, inside the same transaction as the change.

### What is logged, and when

The rule: **every change to a record about a person or a politician is
logged once, against that record, by whoever or whatever made it**, in the
same transaction, so the record's own page can tell its history
(`politicianHistory` in `lib/server/politicians.ts`; a supporter's
history comes from the records themselves). A job that changes many
records logs one summary entry for the run, and one entry per record it
changed. Reading is logged only where the data is personal: each viewing
of a supporter's page. Nothing else about reading is logged.

| Action                                                                        | Actor              | When                                                       | Details name                                         |
| ----------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------------- | ---------------------------------------------------- |
| `add politician`                                                              | `sync`, staff      | The MP sync adds an MP; the signatory import adds a signer | `id`, and their details                              |
| `edit politician`                                                             | `sync`, staff      | The MP sync changes an MP's details; staff edit a signer   | `id`, and their details after                        |
| `remove politician`                                                           | `sync`             | The MP sync finds an MP no longer in Airtable              | `id`, `name`                                         |
| `set status`                                                                  | staff, `controlai` | A campaign status set or cleared, by hand or by the import | `politicianId`, `campaign`, `status`, `date`, `note` |
| `apply MP sync`, `hold MP sync`, `apply held MP sync`, `discard held MP sync` | `sync`, staff      | Each sync's outcome, and each decision on a held one       | counts, or the run's `id`                            |
| `import ControlAI letter`                                                     | `controlai`        | A read of the letter that set or cleared any status        | counts                                               |
| `import signatories from Airtable`                                            | staff              | The one-off import                                         | counts                                               |
| `block address`, `unblock address`                                            | `postmark`, staff  | A bounce or complaint blocks an address; staff unblock it  | `address`, and the `kind` or the `note`              |
| `add staff account`, `set staff permissions`, `remove staff account`          | staff              | The accounts page                                          | `email`, and the permissions `from` and `to`         |
| `view supporter`                                                              | staff              | A supporter's page is opened                               | `id`                                                 |
| `erase supporter`                                                             | staff              | A supporter is erased                                      | `id`, the request's `reference`, and what went       |

Details never carry a supporter's name or address: a supporter is named by
`id`, and an erasure by its reference, so the log stays after the person is
gone. A politician's details are public, so theirs are logged in full.

A new kind of change adds a row here and logs itself the same way. If it
changes a politician, it names `id` or `politicianId` so `politicianHistory`
finds it; if it blocks or frees an address, `address`.

## Staff

Anyone with a pauseai.uk email address can log in, with a link sent to
that address (`lib/server/staff-auth.ts`, `staff-login.ts`). A session
lasts a day, or 30 days renewed on use with "Keep me signed in".

Seeing anything needs a staff account (`staff_accounts`, kept by admins on
`/staff/accounts`): without one, the home page says whom to ask, and every
other page sends you there. An account opens the ordinary pages
(politicians, letters, blocked emails, imports). Permissions open more
(`lib/staff-permissions.ts`): `supporters` the supporter pages, `admin` the
accounts page and the audit log. `admin@pauseai.uk` starts with an account
and the admin permission, as an ordinary row the migration adds. Removing
an account ends its sessions; the last admin can't be removed or lose
admin. A page says what it needs in `requireStaff()`: a login, an account
(the default) or a permission. The groups of pages a staff member sees are
in `lib/staff-sections.ts`. Every change to an account is an audit log
entry.

A new permission is a name in `PERMISSIONS` and the table's `CHECK`, and a
group of pages behind it in `STAFF_SECTIONS`.

## The public site's content

The rest of the site is content more than data: people's stories, local
groups and their pages, press coverage, blog posts, the board
(`lib/content/`). Events are the exception: Luma's calendar is the source
of truth, and the public pages read it live; the copy the import keeps is
for the supporter pages, not for them.
