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
them in a source by `supporter_links`: a Luma user (`luma_user_id`), a
letter (`letter_id`) or a member (`member_id`), matched by trimmed, lowercased email and nothing
more, so `jane+luma@` and `jane@` are two people. The supporter holds no
name, email, phone or place of its own: those come from the linked
records, newest first. `linkSupporters()` (`lib/server/supporters.ts`)
only adds links, runs at the end of each Luma and members import and when
a letter is kept, and is set-based, so running it again does nothing.

Each source (`lib/server/supporter-sources.ts`) gives three views in one
shape, made in the migrations: `supporter_source_<name>` (`source_id`,
`email`, `name`, `seen_at`) for the matcher, `supporter_activity_<name>`
(`source_id`, `at`, `kind`, `title`, `detail`, `href`, `status`) for the
history, and `supporter_contact_<name>` (`source_id`, `at`, `phone`,
`postcode`, `latitude`, `longitude`, `city`) for contact details and places.
`supporter_identity`, `supporter_activity` and `supporter_contact` union
them by supporter, and `supporters_summary` is one row per supporter for
the list. When a supporter was first seen, the earliest `seen_at` of their
records (`supporter_first_seen`), is kept on the supporter
(`supporters.first_seen_at`) by `refreshSupporterFacts()`
(`lib/server/supporter-facts.ts`), which `linkSupporters()` runs, so the
staff home counts new supporters by it without working it out each time. Only staff with the `supporters` permission see them
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
- **Members.** PauseAI's members in the UK whom we may hold: those who
  ticked "Share your details with PauseAI UK" on the join form, or joined
  before it asked (from July 2026). The hourly import
  (`lib/server/members-import.ts`) reads them from Stichting PauseAI's
  "Members & Actions" Airtable base into `members`, keyed by the Airtable
  record ID, which CiviCRM keeps too: the names say what the rows are, not
  where they come from, so a move to CiviCRM keeps them. A member no
  longer read is marked removed and kept, with their links, until
  erased; the summary's `member` is false for them, so they lose the
  Member badge.

**Where they are.** `supporterPlace()` (`lib/supporter-place.ts`) gives a
supporter's best-known place from their contact details: the newest a
source says they gave themselves (a member's city), or failing that the
newest event they registered for, since Luma's places are its events'.
The supporter's page shows the cities they gave, or else that one; finding
supporters near somewhere would use it too.

**Erasure.** When someone asks to be forgotten, staff erase the supporter
from their page (`lib/server/erasure.ts`), under the request's reference.
For each source, what that source holds goes: a letter with its events
and the copies of replies forwarded to the sender; a Luma user with their
registrations and contact; a member's record. What stays is what exists to stop us mailing
the address: `email_problems`,
`email_blocks` and `opt_outs`. The Luma user's ID goes in `luma_erased`,
which the import skips, so they never come back; a new Luma account later
is a new supporter. A member's record ID goes in `members_erased` in the
same way. The audit log entry carries the supporter's ID and the
reference, never a name or address. Luma's own records, the copies of
letters and replies in the policy team's Gmail inbox, and letters sent
through the earlier form in Airtable ("Web form emails") and Stichting
PauseAI's own copy of a member aren't reached from here: an erasure has to go there by hand (`docs/data-protection.md`).

A new source is a table of its own, a column and a widened `CHECK` on
`supporter_links`, its three views and its arms of the union views, a
badge, and its part of erasure.

## Opt-outs

Each time an address opted out of a mailing list, and when it opted back
in, if it has (`opt_outs`, `lib/server/opt-outs.ts`). Keyed by address,
not supporter, because an unsubscribe can arrive before we know whose
address it is; the supporter pages join it to every address a supporter
has. An address is opted out of a list while it has an open row, one at
most per list. A list is named for what was opted out of, not for what
told us, so an address has one opt-out in force per list whoever reported
it. There are two lists. `luma-calendar` is the calendar's emails, which
Luma sends to the calendar's contacts. Unsubscribing from one, marking one
as spam, or being removed or blocked by us takes someone off that list;
following the calendar again puts them back as they were, with the date
they first joined. Unfollowing changes neither. We checked this with a
staff member's own Luma account against `/v1/calendars/contacts/list` in
October 2026. Two things tell us:

- Luma's `calendar.person.unsubscribed` webhook (`/api/luma/webhook`,
  `lib/server/luma-webhooks.ts`), at once, keyed by Luma's `Webhook-Id`
  so a redelivery changes nothing. Luma doesn't say whether it was an
  unsubscribe, a block or a spam report. `calendar.person.subscribed`
  closes the row, but Luma sends it for a new follower, not for one coming
  back.
- The Luma import's full pass over the contacts, every 20 hours
  (`recordContactsPass`). A contact it doesn't list is opted out, as
  `luma-contacts`, from when it noticed, unless they already are; an open
  opt-out begun before it listed them again is closed. That catches what
  the webhook doesn't: returns, removals, blocks, and anyone who left
  before the webhook was set up on 22 Oct 2026.

So someone who leaves, comes back and leaves again within a pass has one
opt-out, not two: the second unsubscribe finds the first still open.

An opt-out is only ever a real unsubscribe, told us by the list's own
sender. `pauseai-updates`, the members' updates, has none yet: they're
sent from CiviCRM, which isn't read. Leaving "Keep me informed" unticked
on joining isn't an opt-out; the member record says it, and the email
permissions read it there.

A new list is a name in the `CHECK`s on `list` and `source`, and whatever
records it.

### Whether we'd email someone

One place decides whether we may email an address about each topic, and
why: the `email_permissions` view
(`netlify/database/migrations/0032_email_permissions.sql`, where each
reason is explained). Everything that asks reads it: the supporter's page
and the list's Subscriptions column, through `permissionsFor()` in
`lib/server/email-permissions.ts`; the list's Subscriptions filter; and the
staff home's count of Luma unsubscribes. Nothing else reads `opt_outs`
to answer it, and `tests/checks/opt-outs.test.ts` fails if code outside
`lib/server/opt-outs.ts` and erasure does.

The topics are the Luma calendar's emails, the PauseAI updates, and news
of events and ways to help from the consent box on a letter. Each answer
is yes, no or unsure, with a reason from a short list, when, and which
source said so. The first rule that matches wins:

- a blocked address (`email_blocks`, below) is no to everything;
- then an opt-out in force is no;
- then each topic's source: being a contact of the Luma calendar, which
  registering for an event makes someone, as following it does, whenever
  they joined (Luma's list leaves out anyone who left); the newest member
  record's "Keep me informed" (a free choice from 30 June 2026; before,
  everyone who joined was on the list); the newest letter's consent box.

Unsure is a yes that an unsubscribe we can't see may have undone: every
member on the updates, which CiviCRM sends. A
topic the address has had nothing to do with (no Luma account, never a
member, no letter) has no row. Nothing sends email by it yet; when the
site mails supporters, `send()` asks it for the purpose's topic as it
checks `email_blocks`.

## Email

Everything the site sends, to anyone (`lib/server/email.ts`). Every email
goes through `send()` with its purpose: `letter`, `forwarded-reply`,
`staff-login` or `staff-alert`. Each try is logged (`email_sends`): when,
why, to whom, and whether it went.

When an email bounces or its recipient marks it as spam, the problem is
recorded against the address (`email_problems`). A hard bounce or a
complaint blocks the address (`email_blocks`), and `send()` won't send to a
blocked address, for any purpose. Staff see politicians' blocked addresses
at `/staff/politicians/blocked-emails` and on the politician's page, and
every other (supporters', staff's and unknown ones), with `supporters`, at
`/staff/supporters/blocked-emails`: two pages over the same tables, split by
whether the address is a politician's now. Staff can unblock a bounced
one, which asks Postmark to send to it again. A complaint can't be
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
Parliament, the ControlAI letter, the signatory import, the Luma import,
the members import (`IMPORT_JOBS` in `lib/import-runs.ts`). Each runs on a schedule or when
staff press its button, and
every run is recorded (`import_runs`): when, who started it (`nightly` or a
staff email), how it ended, why it failed, and the job's own account of
what it found. A run can be held for staff to decide on, as a large MP sync
is. `/staff/import-data` shows each job's newest run on a card, and each
job's own page (`/staff/import-data/<slug>`, `importPath()` in
`lib/import-runs.ts`) its button and every run.

A new job is a name in `IMPORT_JOBS` and the `import_runs` CHECK, a result
type, a function that records its run, a slug in `IMPORT_SLUGS`, its
lozenges and description in `ImportJob.tsx`, its button's Server Action in
the job page, and a scheduled function if it runs on a schedule. A job that has more to do
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
| `edit politician`                                                             | `sync`             | The MP sync changes an MP's details                        | `id`, and their details after                        |
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
lasts a day, or 30 days renewed on use with "Keep me signed in". Anyone at
pauseai.uk can be staff, paid or volunteer: the mailbox decides who can log
in, and a leaver's Google account is suspended or deleted, so no login link
reaches them. That relies on a suspended or deleted Google account not
receiving mail, and on a leaver's mail not being forwarded or aliased to
someone else, who could then log in as them.

The first login gives an address a staff account (`staff_accounts`) with
no permissions, added by `login`; admins give permissions on
`/staff/accounts`, where they can also add someone before their first
login. To limit someone who's staying, take away their permissions: after
Remove, logging in again makes a new account with none.

An account opens the pages about politicians and campaigns (politicians,
an MP's page, Blocked MP emails, imports).
Permissions open more (`lib/staff-permissions.ts`): `supporters` every page
with a member of the public's details (supporters, letters, who wrote to
which MP, Blocked supporter emails), `admin` the accounts page and the
audit log. `admin` doesn't include `supporters`. An MP's page is the one
page that shows less without a permission: without `supporters`, its
letters come from a query that doesn't select their senders, so none reach
the browser. `admin@pauseai.uk` starts with an account and the admin
permission, as an ordinary row the migration adds. Removing an account ends
its sessions; the last admin can't be removed or lose admin.

The accounts page shows when each account was added and by whom (or by
its login), when it last logged in and was last seen (`last_login_at` and
`last_seen_at`, kept on the account, as sessions are deleted when they
end), and its sessions open, which an admin can end. Anyone logged in on
more than one device sees how many under Log out, linked to the page of
their sessions (`/staff/sessions`), where they can end them all.

Each page in the navigation, and so each page under it, has the permission
`lib/staff-sections.ts` gives it, and asks for it in `requireStaff()`: an
account (the default) or a permission.
`tests/checks/staff-auth.test.ts` checks the two agree, and the
`permissions` storyboard section checks that, with no permissions, no page
holds a supporter's name or email. Every change to an account is an audit
log entry.

A new permission is a name in `PERMISSIONS` and the table's `CHECK`, and the
pages it opens given it in `STAFF_SECTIONS`.

## The public site's content

The rest of the site is content more than data: people's stories, local
groups and their pages, press coverage, blog posts, the board
(`lib/content/`). Events are the exception: Luma's calendar is the source
of truth, and the public pages read it live; the copy the import keeps is
for the supporter pages, not for them.
