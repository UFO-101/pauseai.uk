# Domain concepts

The things the site's features are built from, and how far each is
generalised. A new feature should use these, or grow one, rather than make
its own: a new kind of email is a new purpose of the one email concept, not
a second email system. The features themselves are listed in the README;
where code goes and how it's written is in `docs/code-structure.md`.

Each section says what the concept is, where it lives, how to add another
of its kind, and what it doesn't cover yet.

## A full history of everyone

We keep the whole history of our activity with everyone: every letter,
email, signature, meeting and status, for politicians and supporters
alike. A record is never deleted because it stopped being current. A
politician who leaves office, a person a source no longer lists or an event
taken off Luma is marked as such and kept, along with everything that points
at it. What came from an outside source says which one, so a page can say
"from Airtable" rather than present it as something staff set. The one
exception is erasure: a supporter who asks to be forgotten is removed
(`docs/data-protection.md`).

What a letter said is kept only where it isn't sensitive. A supporter's
letter to a politician, and the politician's reply to it, can show the
supporter's political opinions and personal circumstances, so neither's
text is kept: only who, when, and what happened to it. A letter PauseAI
sends a politician, and their reply, are kept in full, since they're our
own words and a public figure's answer in their public role.

## Notable people and politicians

Everyone we campaign at is a notable person (`notable_people`): for now,
only politicians, MPs, peers, MSPs, members of the Senedd and the Northern
Ireland Assembly, and others (`HOUSES` in `lib/server/politicians.ts`). A
notable person has what all kinds share: a name as they're known in public,
with any title that's part of it ("Lord McFall of Alcluith"); a salutation,
which follows "Dear" and is written by hand, as no rule makes it from the
name ("Sir Iain", "Bishop"); an email if we know it; notes; Airtable's markers
(important target, personal connection); and a status, `in_office`, `died`,
`retired` or `left_office`. A politician (`politicians`) adds a house, a
constituency if they have one, a party and a country. The child row
joins its parent by a composite foreign key `(id, kind)`, so it can only be
the kind its parent says, and everything else points at the parent: a new
kind, such as journalists, is a new kind and a child table, and changes
nothing else. One who leaves office is marked, never deleted, so their
history stays.

Where they come from:

- **Airtable's UK Parliamentarians**, which the policy team keeps, is copied
  nightly, every body, keyed by the record's ID
  (`lib/server/politician-sync.ts`), all but the records ticked Test. A
  sync that would change more than 20 people at once, or anyone's name
  (which may be Airtable reusing a record for someone new), is held for
  staff to apply or discard. A record gone from Airtable keeps its status
  and gets `airtable_removed_at`. A nightly check compares the MPs with
  Parliament's Members API and reports differences, changing nothing
  (`lib/server/mp-check.ts`).
- **Test MPs** are fixed, each found by a test postcode (`lib/test-mps.json`,
  ZZ99Z\*) and each standing for one case: an ordinary MP, one who has
  signed, one with no email, one whose email bounces. A new case that a
  person would see gets a new test MP.

Only an MP in office in the Commons is found by postcode. Writing to anyone
else would need a way to find them (a region for an MSP, a list for peers).

## Asks

Something we ask notable people to do whose answer we record: sign a
letter, come to an event (`asks`, `lib/asks.ts`). Each has a slug, a title,
a kind (`letter` or `event`), a date, a link to the letter or the
event, and who asks it: supporters, in their letters or in person, PauseAI,
in its own emails, ControlAI, for its own statement and letter, or more than
one. A migration adds each.

A person's answer to an ask is a status (`ask_statuses`): one row per
person per ask, with a status, a date, a note, and who set it; no answer,
no row. Each kind allows its own statuses (`ask_kind_statuses`, mirrored by
`ASK_STATUSES`): a letter `signed`; an event `going`, `tentative`,
`meeting_staff`, `tentative_staff`, `declined`, `declined_surgery` or
`passed_on`. A foreign key on `(ask_kind, status)` refuses any other, and a
new status is a row there.

Who set a status decides who may change it. Staff set statuses by hand, with
a note, for the asks of the campaigns they track (`trackedAsks`). An import
owns the statuses it sets, and changes or removes only those, leaving alone
a status set by staff or another import: the ControlAI import sets
ControlAI's letter to the Prime Minister from its PDF (`updated_by`
`controlai`, `lib/server/controlai-import.ts`); the politician sync sets the
letters, ControlAI's campaign statement and the conference Airtable records (`airtable`, `AIRTABLE_ASKS`); the one-off
Go to Parliament import its meetings (`airtable`,
`lib/server/go-to-parliament-import.ts`). `/staff/asks` lists the asks, newest
first, who asks each, and how many gave each answer.

## Campaigns

One letter many supporters send, for an ask or for none (`campaigns`): sign
the letter to the PM, come to the Sobel bill's debate. Each is keyed by its
slug, which its page's URL and its letters use, and its row names its ask.
The rest is copy, in code (`campaigns` in `lib/content/email-your-mp.ts`):
its letter, subject and attachments, and, if it can be done, the status of
its ask that means it is. A test checks each campaign in code has a row
with the same title and ask; pauseai.info's old campaigns are rows only.
The list in code is in priority order: a person writing to their MP is
shown the first campaign whose ask that MP hasn't met. So the last campaign
is one nobody has done, and there's always one to move on to.

A new campaign is an entry in that list, its row in a migration, its page
in `app/(site)/campaigns/<slug>/`, and a link in the nav.

## Letters

Every letter to a notable person (`letters`): its kind, the person, when it
was made and sent, and its status (`sending`, `sent`, `not_sent`,
`bounced`, `spam_complaint`, and for PauseAI's only, `scheduled` and
`cancelled`), with a log of everything that happened to it
(`letter_events`), including replies and automatic replies. A child row
adds what its kind has, joined as notable people are:

- **A supporter's letter** (`letters_from_supporters`): the campaign and subject,
  and the form entry of the person who sent it (`entry_id`; "Form
  entries", below), which holds their name, email, address, postcode and
  consent. Sent through the
  site, it goes from an address of its own on `letters.pauseai.uk`
  (`reply_hash`), so a reply comes back to us, matched by that address, and
  is forwarded to the sender and the policy team. Its text isn't kept: the
  only copy is the one Bcc'd to `REPLIES_INBOX`. Each sender email can send
  one letter per campaign, except to a test MP. The letters sent through
  pauseai.info's old form were imported once from Airtable
  (`lib/server/web-form-import.ts`), keyed by the record, with no address
  of their own.
- **PauseAI's letter** (`letters_from_pauseai`): one person's letter of a mailing
  (`mailings`), which may make an ask. Those sent before the site could send
  them are copied nightly from Airtable's Emails table
  (`lib/server/emails-sync.ts`): who, when, and whether it was
  personalised, but no text. Each mailing there is a
  tick box, named by `mailings.airtable_field`; an email with no box we know
  is held back and reported until a migration adds its mailing.
  A mailing written on the site (`lib/server/mailing-drafts.ts`) holds the
  politicians list's filter that chose its recipients, as the list's URL
  parameters (`StoredFilter`), and its letter, a document with merge fields
  and parts only some recipients get (`lib/mailing-doc.ts`). It's a draft,
  saved with a version number, until it's scheduled, which fixes its
  recipients: a scheduled PauseAI letter each, keeping the values its
  fields had. Those with no address, or a blocked one, are left out.

A letter's ask is its campaign's or its mailing's, never its own.

## Form entries

One person filling in one of our forms once (`form_entries`): their name,
email, phone, address, city and postcode as they gave them, the box to hear
from us (`contact_consent`), where they came from (`utm_source`) and when.
`form` says which form: `email-your-mp`, `march-2026-11`, or
`web-form` for pauseai.info's old letter form. What only some forms make
hangs off the entry, one to one: a letter's sender is the entry its
`letters_from_supporters` row points at.

A new form is a value in the `CHECK` on `form`, a label in the staff
interface's `sources`, and, if it makes more than an entry, a child table
pointing at `form_entries`, as `form_entry_luma` holds what Luma said to a
form that registers people for an event. What a form's box said when
someone ticked it is its wording in git at the entry's `created_at`.

## Supporters

One row per person we know of (`supporters`), tied to each record about
them in a source by `supporter_links`: a Luma user (`luma_user_id`), a
form entry (`form_entry_id`) or a member (`member_id`), matched by trimmed, lowercased email and nothing
more, so `jane+luma@` and `jane@` are two people. The supporter holds no
name, email, phone or place of its own: those come from the linked
records, newest first. `linkSupporters()` (`lib/server/supporters.ts`)
only adds links, runs at the end of each Luma and members import and when
a form entry is kept, and is set-based, so running it again does nothing.
Then supporters who gave the same UK mobile number (`+447…` as
`phone_number()` writes it) are one person, whatever their emails:
`merge_supporters_by_phone()` moves the newer one's links and messages to
the older and deletes it, and `supporter_merges` keeps its ID, so its old
page, `/staff/supporters/<id>`, redirects to the one it went into. Landlines and
numbers abroad aren't matched, as households and offices share them.

Each source (`lib/server/supporter-sources.ts`) gives three views in one
shape, made in the migrations: `supporter_source_<name>` (`source_id`,
`email`, `name`, `seen_at`) for the matcher, `supporter_activity_<name>`
(`source_id`, `at`, `kind`, `title`, `detail`, `href`, `status`) for the
history, and `supporter_contact_<name>` (`source_id`, `at`, `phone`,
`postcode`, `latitude`, `longitude`, `city`) for contact details and places.
`supporter_identity`, `supporter_activity` and `supporter_contact` union
them by supporter (Luma's activity is two arms of `supporter_activity`
itself, as Postgres can't narrow a union inside a join to one supporter),
and `supporters_summary` is one row per supporter. The list reads
`supporters_listed`: `supporters_list`, a materialized view of every
supporter's summary and place, refreshed by `refreshSupportersList()` at
the end of each import that links supporters and by an erasure, and anyone
added since, worked out as it's read. So a supporter's counts, tags and
place in the list are as of the last import, up to an hour old (overnight,
until 06:17), but for whether they're a Luma contact: an opt-out from the
calendar, or its end, is looked up as the list is read
(`optedOutOfLuma()`). Their own page is always as they are now. When a supporter was first seen, the earliest `seen_at` of their
records (`supporter_first_seen`), is kept on the supporter
(`supporters.first_seen_at`) by `refreshSupporterFacts()`
(`lib/server/supporter-facts.ts`), which `linkSupporters()` runs, so the
staff home counts new supporters by it without working it out each time. Only staff with the `supporters` permission see them
(`/staff/supporters`), and each download of a list of them (supporters,
letters, their blocked addresses) is an audit log entry.

Where they come from:

- **Luma.** The hourly import (`lib/server/luma-import.ts`) copies every
  public event on our calendar into `luma_events`, each registered guest
  into `luma_guests` (phone, a postcode answer, `utm_source`; never Luma's
  invited-only rows) and every Luma user into `luma_people`, with when
  they joined the calendar as a contact and when a read of the contacts
  last listed them. Luma's own IDs are the keys, and
  only the import writes these tables. The site's events pages still read
  Luma live.
- **Our forms.** Each form entry ("Form entries", above). Its source in
  `supporter_identity`, `supporter_activity` and `supporter_contact` is its
  form, so staff see which; a letter is activity of the entry that sent it.
  pauseai.info's old form got its consent box on 23 September 2026, so an
  entry from before it is no.
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
For each source, what that source holds goes: a form entry, with its
letter, the letter's events and the copies of replies forwarded to the
sender; a Luma user with their
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
- The end of each of the Luma import's full passes over the contacts,
  one after another, ten pages a run (`recordContactsPass`). A contact it
  doesn't list is opted out, as `luma-contacts`, from when it noticed,
  unless they already are; an open opt-out begun before it listed them
  again is closed. That catches what
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

### Whether we'd contact someone

One place decides whether we may contact an email address or a phone
number about each topic, and why: `contact_permission()`
(`netlify/database/migrations/0049_contact_permissions.sql`, where each
reason is explained), read through the `email_permissions` and
`phone_permissions` views and `contact_permissions`, both of them.
Everything that asks reads those: the supporter's page and the list's
Contact, Email and Phone columns, through `permissionsFor()` in
`lib/server/contact-permissions.ts`; the list's Contact filter;
and the staff home's count of Luma unsubscribes, through the
`contact_unsubscribes` view. Nothing else
reads `opt_outs` to answer it, and `tests/checks/opt-outs.test.ts` fails if
code outside `lib/server/opt-outs.ts` and erasure does.

An address or a number does two jobs, kept apart. It says which records
are one person, so every one is kept and shown, whatever its answers. And
it's a way to reach someone, which needs a yes: the answer is for one
topic, one channel and one address, so someone who gave Luma one number and
the join form another has an answer for each.

The topics, and the channels each goes by (`TOPIC_REASONS` in
`lib/contact-permissions.ts`):

- **Luma calendar**, email and phone: being a contact of the calendar,
  which registering for an event makes someone, as following it does,
  whenever they joined (Luma's list leaves out anyone who left). A number
  given at a registration was given by a Luma account, so it has that
  account's answer: an unsubscribe from the calendar's emails is a no for
  its number too. The same number given anywhere else has its own answers.
- **PauseAI updates**, email: the newest member record's "Keep me
  informed" (a free choice from 30 June 2026; before, everyone who joined
  was on the list).
- **Site forms**, email and phone: the newest form entry's box, which on
  the march's says "by email and phone".
- **Volunteering**, phone: the join form asks for a number only of those
  who choose to volunteer regularly, for volunteers' messages. Before 30
  June 2026 it was a Tally form with no choice, taken to be the same, so a
  number on a record with no intent is a yes too; one with another intent
  is unsure.
- **March day**, phone: a number given for "text updates on the day" is a
  yes until the day ends (`day_texts`), then no, unless the box said yes
  to site forms.

A number is one channel, but a topic says which ways it allows
(`TOPIC_WAYS` in `lib/contact-permissions.ts`), from what people were
told when they gave it: Luma's and the march day's are for texts only,
site forms' and volunteering's for calls and texts too. Calling someone
without their consent is allowed in the UK only to a number that isn't
on the Telephone Preference Service, so a calling tool reads the ways,
not just the answer.

Each answer is yes, no or unsure, with a reason from a short list, when,
and which source said so. The first rule that matches wins: a blocked
email address (`email_blocks`, below) is no to everything; then an opt-out
in force, by its channel, is no; then the topic's source.

Unsure is a yes that an unsubscribe we can't see may have undone: every
member on the updates, which CiviCRM sends. A topic the address or number
has had nothing to do with has no row. The list shows an Email or Phone
column only with the Contact filter by that channel, and in it the
addresses or numbers whose answer the filter finds; a download, vCards
too, has the same. The supporter's page shows every address and number,
marking a number no topic lets us use.
Nothing sends by it yet; when the site mails supporters, `send()` asks it
for the purpose's topic as it checks `email_blocks`.

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

A job that copies data in from outside: the politician sync, the Emails
sync, the check against Parliament, the ControlAI letter, the Luma import,
the members import, and the one-off imports of pauseai.info's web form
letters and Go to Parliament's meetings (`IMPORT_JOBS` in
`lib/import-runs.ts`). Each runs on a schedule or when
staff press its button, and
every run is recorded (`import_runs`): when, who started it (`nightly` or a
staff email), how it ended, why it failed, and the job's own account of
what it found. A run can be held for staff to decide on, as a large politician sync
is. `/staff/import-data` shows each job's newest run on a card, and each
job's own page (`/staff/import-data/<slug>`, `importPath()` in
`lib/import-runs.ts`) its button and every run it keeps: a week of an
hourly job's, a month of a nightly one's, a one-off job's last 50, and
always its newest and a held run (`lib/server/log-retention.ts`, run
nightly).

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
changed. Reading is logged only where the data is personal and leaves the
site: each download of a list of supporters, their letters or their
blocked addresses. Nothing else about reading is logged.

| Action                                                                                                        | Actor                          | When                                                                        | Details name                                                 |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `add politician`                                                                                              | `sync`                         | The politician sync adds a politician                                       | `id`, and their details                                      |
| `edit politician`                                                                                             | `sync`                         | The politician sync changes a politician's details, or their record is back | `id`, `name`, and each field `changed`, before and after     |
| `remove politician`                                                                                           | `sync`                         | The politician sync finds a record no longer in Airtable                    | `id`, `name`                                                 |
| `set status`                                                                                                  | staff, `controlai`, `airtable` | A status set or cleared, by hand or by an import                            | `politicianId`, `ask`, `status`, `date`, `note`              |
| `apply politician sync`, `hold politician sync`, `apply held politician sync`, `discard held politician sync` | `sync`, staff                  | Each sync's outcome, and each decision on a held one                        | counts, or the run's `id`                                    |
| `copy PauseAI emails`                                                                                         | `sync`                         | The Emails sync adds any                                                    | `added`                                                      |
| `import web form letters`                                                                                     | staff                          | The one-off import of pauseai.info's letters                                | counts                                                       |
| `import Go to Parliament`                                                                                     | staff                          | The one-off import of its meetings                                          | counts                                                       |
| `import ControlAI letter`                                                                                     | `controlai`                    | A read of the letter that set or cleared any status                         | counts                                                       |
| `block address`, `unblock address`                                                                            | `postmark`, staff              | A bounce or complaint blocks an address; staff unblock it                   | `address`, and the `kind` or the `note`                      |
| `add staff account`, `set staff permissions`, `remove staff account`                                          | staff                          | The accounts page                                                           | `email`, and the permissions `from` and `to`                 |
| `download supporters`, `download letters`, `download blocked emails`                                          | staff                          | A list of them is downloaded, as CSV or JSON                                | the list's `filters` in words, the `format`, how many `rows` |
| `erase supporter`                                                                                             | staff                          | A supporter is erased                                                       | `id`, the request's `reference`, and what went               |

Entries from before asks and the politician sync keep their own names: a
status set by `campaign`, `apply MP sync` and the rest, and `import
signatories from Airtable`. So do `view supporter` entries, from when each
opening of a supporter's page was logged (`id`).

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
an MP's page, Politicians' blocked emails, imports).
Permissions open more (`lib/staff-permissions.ts`): `supporters` every page
with a member of the public's details (supporters, letters, who wrote to
which MP, Supporters' blocked emails), `admin` the accounts page and the
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
