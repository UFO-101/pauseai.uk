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

What a letter said is kept where we need it to do the job. A supporter's
letter to their MP, and every message between them and the MP's office,
are kept whole, as the site relays them ("Letters", below); they can show
the supporter's political opinions and personal circumstances, so only
staff with `supporters` see them, and erasure deletes them. Letters sent
before the letters inbox have their text too, from Airtable's copy or the one
Bcc'd to the policy team, once imported ("The import of old letters", below).
A letter PauseAI sends a politician, and their reply, are kept in full, since
they're our own words and a public figure's answer in their public role. So
is every other thread with a politician in the policy team's mailboxes
("One-off emails", below).

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
one. Staff add, change and delete them on `/staff/asks`, or from a
mailing's Ask: the slug is made from the title and the date's month, and
never changes; the kind is fixed once anyone has answered; an ask can be
deleted only while no answer, campaign or mailing refers to it. The asks
`lib/asks.ts` names (`FIXED_ASKS`) can't be changed there, as imports and
campaigns depend on them.

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
first, who asks each, how many gave each answer, how many were written to and
how they were asked. An ask's own page (`/staff/asks/[slug]`) says what they
were asked in a politician's page's words, then lists the campaigns and
mailings that put it, by date, beside its answers. It has no letters of its
own. Its form is at `/staff/asks/[slug]/edit`.

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

Staff see them as a mailing, from supporters rather than PauseAI: `/staff/campaigns`
lists them under the month of each one's most recent letter, with a mailing's
counts, and a campaign's page (`/staff/campaigns/[slug]`, `lib/server/campaigns.ts`)
has its header, how many answered its ask, "The letter" with each version of its
text and how much people changed it, and "Letters", which its counts choose among. A version is the code's text for a campaign in that list, and for
pauseai.info's old ones each commit of its form live when a letter was written
(`FORM_VERSIONS` in `lib/content/pauseai-info-form.ts`).

## Letters

Every letter to a notable person (`letters`): its kind, the person, when it
was made and sent, and its status (`sending`, `sent`, `not_sent`,
`bounced` or `spam_complaint`; a supporter's can also be `queued`, and
PauseAI's `scheduled`, `cancelled` or `skipped`), with a log of everything
that happened to it
(`letter_events`), including replies and automatic replies. A child row
adds what its kind has, joined as notable people are:

- **A supporter's letter** (`letters_from_supporters`): the campaign and subject,
  and the form entry of the person who sent it (`entry_id`; "Form
  entries", below), which holds their name, email, address, postcode and
  consent. Each sender email can send one letter per campaign, except to a
  test MP. See "Letters through the letters inbox", below. Letters sent
  before it went by Postmark from an address of their own on
  `letters.pauseai.uk` (`postmark_mailbox`), with the sender on Cc, and a
  reply to that address is still forwarded to the sender and the policy
  team (`forwardReply`, `lib/server/postmark-webhooks.ts`). The letters sent
  through pauseai.info's old form were imported once from Airtable
  (`lib/server/web-form-import.ts`), keyed by the record, with neither. Both
  have their text in `letter` once the import of old letters has run, a form
  letter with the form's text live then in `draft`, so its page shows what its
  writer changed as a letter through the letters inbox does.
- **PauseAI's letter** (`letters_from_pauseai`): one person's letter of a mailing
  (`mailings`), which may make an ask. Those sent before the site could send
  them are copied from Airtable's Emails table, when staff press its import
  (`lib/server/emails-sync.ts`): who, when, and whether it was
  personalised, but no text. Each mailing there is a
  tick box, named by `mailings.airtable_field`; an email with no box we know
  is held back and reported until a migration adds its mailing.
  A mailing written on the site (`lib/server/mailing-drafts.ts`) is a
  draft from the moment New mailing is pressed. It holds the politicians
  ticked for it on the politicians list, by ID (`StoredFilter`'s
  `picked`): a fixed list, which a later by-election doesn't change. When
  everyone a filter found was ticked, it keeps that filter, the day and
  who it found, so the mailing can say who it's to as that group, plus or
  minus a few (`lib/mailing-picks.ts`). One made before ticks holds the
  list's filter instead, as its URL parameters, until its first tick. It
  also holds its letter, a document with merge fields and parts only some
  recipients get (`lib/mailing-doc.ts`). It's saved with a version number
  until it's scheduled, which fixes its recipients: a scheduled PauseAI
  letter each, keeping the values its fields had. Those with no address,
  or a blocked one, are left out.

A letter's ask is its campaign's or its mailing's, never its own.

**A letter's history** is its events, shown on its page newest first,
each with what it recorded (`historyOf` and `LetterHistory` in
`app/(staff)/staff/_components/LetterHistory.tsx`; how they're laid out
is in `docs/style-guide.md`, "A history").

### Letters through the letters inbox

Supporters' letters go to MPs from the letters inbox, a Gmail account used
for nothing else (`LETTERS_INBOX`, `lib/server/letters-inbox.ts`), and
each side sees the other only as a proxy, a plus address on it
(`proxies`, `lib/server/proxies.ts`): the MP gets the letter from
`"Jane Smith (via PauseAI)" <letters+jane.smith@…>`, the supporter gets the
MP's replies from `"Meg Hillier MP (via PauseAI)" <letters+meg.hillier.mp@…>`.
The MP's office never sees the supporter's address. A supporter's proxy is
keyed by their email address, so it's the same in every letter, and named
from their first letter's name; an MP's is named the first time they're
written to and kept.

- **Sending** (`lib/server/mp-letters.ts`, `letter-sending.ts`): a letter
  that passes the form's checks is kept, `queued`, and never deleted for
  failing to send. The request tries at once: the letter, from the
  supporter's proxy to the MP alone, then the supporter's copy, from their
  proxy to them, Reply-To the MP's proxy, with a line above it saying
  what it is, so Reply and Reply all reach only our proxies. It's
  addressed to them, not Bcc'd, as Outlook files mail its reader is only
  Bcc'd on as junk more readily.
  What can't go waits with its reason: the letters inbox not connected or
  at its daily limit (1,950 of Google's 2,000, `LETTERS_DAILY_LIMIT`),
  Gmail failing, or the MP's address blocked; the sent page says it will
  go. The hourly `send-mailings` job works through the queue: relays
  first, then letters, oldest first, then copies. Each letter keeps the
  draft the form began with, rebuilt on the server (approximate if a
  deploy changed it since the form opened), and the share of its words
  that are the supporter's own; its page shows only what they changed,
  the paragraphs they left alone folded (`LetterChanges`).
- **Reading and relaying** (`lib/server/letters-inbox-reading.ts`,
  `relays.ts`): `read-gmail`, every 5 minutes, reads the letters inbox, Spam
  included, all of it ours. A message from the MP's office (Parliament's
  domain, or the address the letter went to) to the supporter's proxy is
  relayed to the supporter from the MP's proxy, in the thread of their
  copy; one from the supporter, to either proxy, to the MP from theirs,
  naming the letter; an automatic reply either way too, keeping the marks
  that stop responders answering it. A relay is the same message, byte for
  byte, with only the headers ours (`relayMime`), and nobody the office
  copied in gets it. Only mail that Google found passes DMARC (or, with no
  policy, aligned SPF or DKIM) is relayed. Which letter a message is for:
  the supporter's only one to that MP, else by the IDs it names, its
  Gmail thread, a Case Ref, its subject, or failing those the latest, as an
  uncertain match. Every message is kept whole (`letter_replies`, Netlify
  Blobs), and each relay is a row (`letter_relays`) recorded before it's
  sent, so a run that stops between is shown as uncertain rather than sent
  twice. A letter's relays are capped, 5 an hour and 20 a day
  (`RELAY_CAP`), so a loop of automatic replies stops. Each message is
  labelled in Gmail and archived, but for mail it can't account for (an
  unknown proxy, a stranger, a forgery, one over the cap, a bounce of
  nothing we sent), which is labelled "Not understood" and left in the
  inbox, and fails the run, which lists each with a link to it in Gmail
  and emails the notification inbox once ("Email", below); spam to no
  letter is only counted.
- **Bounces**: the letter, or a relay to the MP, bouncing hard blocks the
  MP's address, emails the notification inbox, and tells the supporter, in our own words,
  in their copy's thread; once staff unblock the address, or the MP's
  address changes, what bounced goes again and the supporter is told
  (`resendAfterFix`). The supporter's copy, or a relay to them, bouncing
  blocks their address, and later relays to them are held, in case staff
  unblock it; a day on, if one still is, the MP's office is told once,
  from the supporter's proxy in the thread of their reply, that it can't
  be passed on (`lib/server/held-replies.ts`). A soft bounce is only
  noted.

### Mailings to politicians

A mailing written on the site goes from a staff member's own Gmail, as if
they'd written each letter, one at a time: no unsubscribe link, no consent
check, as to public figures in their public role. Each staff member
connects their own Gmail, on their page (`/staff/me`), which a mailing's
Sent from links to while theirs isn't connected (`lib/server/gmail-accounts.ts`); once it's connected, any staff
member can send a mailing from it. The Google Cloud project's consent
screen is Internal, so only accounts in PauseAI's Google Workspace,
pauseai.info's as well as pauseai.uk's, can grant access, and the site
takes only the logged-in staff member's own address. The refresh
token is kept encrypted (`GMAIL_TOKEN_KEY`), and deleted on disconnecting.

- **From name.** A mailing goes in a name of its own, or with none, the
  name the Gmail sends as (its primary "Send mail as" address's), which
  Sent from fills in until it's edited. It always goes from the account's own address: Gmail
  sends as its other "Send mail as" addresses too, but the API can't tell
  a Google Group's from an alias's, and replies to a Group's don't reach
  the mailbox the site reads.
- **Scheduling** needs the Gmail it's from connected, and no more
  recipients than one account sends in a day: the site sends at most
  1,800 a day from an account, counting every mailing, under Gmail's 2,000,
  so the person's own email still goes (`GMAIL_DAILY_LIMIT`).
- **Sending** (`lib/server/mailing-sending.ts`): the hourly
  `send-mailings` job, at 18 minutes past, starts each scheduled mailing
  that's due, none before 06:18 UTC, so a mailing due at 09:00 goes at 09:18
  and one due overnight at 06:18; the staff pages say so (`SENDING` in
  `lib/staff-time.ts`). Then it sends
  its letters at Gmail's pace, one a second, marking each as it goes. A
  scheduled function has 30 seconds, so while letters are left it starts a
  background function, which calls the site again and again for up to 15
  minutes; the next hour takes up the rest. Each letter is checked just
  before it goes: a politician out of office, or whose address has been
  blocked since, is skipped, and the letter says why. An account at its
  limit, or no longer connected, waits.
- **Message-IDs.** Every letter of a mailing goes with a Message-ID of ours,
  whichever backend sends it, so a reply is matched by the IDs it names.
  Gmail sends it with one of its own instead (`…@mail.gmail.com`), so
  after sending, the site asks Gmail which it went with and keeps that
  (`email_sends.rfc_message_id`). The letter's own copy in Sent is known
  by Gmail's ID for it too, and a bounce naming no letter we know is
  matched by the Gmail thread it's in. `send()` takes a backend: Postmark, or a
  connected Gmail.
- **Reading** (`lib/server/gmail-reading.ts`): the `read-gmail` job, every 5 minutes,
  lists each mailbox's new messages since the last `historyId`, and
  fetches only their reply headers. It fetches whole only the messages in
  our letters' threads, and bounces. A bounce, from mailer-daemon or
  postmaster, is recorded as Postmark's are, marked found in Gmail; as a
  bounce from another server may not be in the thread, the last three days'
  are searched for too. An automatic reply is an event on the letter. Any
  other message in the thread, the politician's reply or our answer, is
  kept whole, gzipped, in Netlify Blobs, with a row in `letter_replies`;
  the backup Worker copies them (`backup/README.md`). Each run is in the
  import log, with what it found in each account, and staff can run it
  from its page under Import data.
- **Threads.** Each PauseAI letter has a page with its whole thread
  (`/staff/mailings/<id>/letters/<letter>`), from the politician's history
  and the mailing's recipients, with Copy Gmail search
  (`lib/letter-links.ts`): a search for it by its Message-ID, to paste
  into Gmail where the mailbox it went from can be seen, a delegate's
  included. Gmail has no link into a delegated mailbox. A supporter's
  letter's page has the same, for its copy in `POLICY_INBOX`.

### The import of old letters

A one-off job (`import-old-letters`, `lib/server/old-letters-import.ts`, its
rules in `lib/old-letters.ts`) reads the letters written before the site could
send them from Joseph's and policy@'s mail, so each one's text, diff and replies
show on its page. It runs every 5 minutes, and when its button is pressed, reading
for 20 seconds each time. Its place is `old_letters_mail`, the Gmail ID of each
message it has listed and what became of it, and the last run's `searchesDone`,
so each run carries on from the last and skips what's kept. Once a run finishes
the schedule does nothing more, and a press goes through it all again. It reads at
most two a second, as Gmail's limit is shared with the site, and stops the moment
Gmail refuses; a mailbox's limit applies to all its reading, the regular read's too.

- **Mailings.** A send is a mailing, so the list shows it and its counts
  (`OLD_MAILINGS`): DeepMind's told apart by the phrases in their text, the
  documentary's by subject and text. A new one has its dates in
  `airtable_sent_between`, as the constraints need. The Emails sync places a new
  record in the first dated mailing by ID, so it stays with the first.
- **Joining.** A letter joins a sent email to the politician's address, sent from
  25 minutes before its time in production to 5 seconds after it (`joinSent`). A
  sent email from PauseAI with no letter is one if its subject says so
  (`mailingOfNewLetter`). One from a supporter, who may send a form letter twice
  though production keeps one for each ask, goes on their letter in the campaign
  Airtable's record of that send says (`formLetterRepeated`). With no such record,
  or one marked spam or invalid, it's a one-off.
- **Text.** Many of Joseph's sends kept only each character's low byte, whatever
  charset they name. Bytes not valid in that charset are read one to a character
  (`decodedText`), and the control characters that curly quotes and dashes became
  are made whole (`restoreCutDown`). Characters whose low byte is an ordinary one,
  such as an ellipsis as `&`, can't be told apart. Letters whose paragraphs were
  read as one are split again at the sentences their mailing's letters share
  (`splitFlatLetters`), which needs only what's kept.
- **What's stored.** A mailing's template in `imported_text`, in `body`'s format,
  its subject and who it went from; each letter that fits it, its greeting and own
  paragraph in `merge_values`, and one that doesn't, its whole text in `own_text`.
  Its sent email is an `email_sends` row with `imported`, its real date, Message-ID
  and Gmail thread, so the site's regular read joins later replies and bounces to
  it, and as it keeps its date it doesn't count against `GMAIL_DAILY_LIMIT`.
- **Replies** (`placeReply`): by Gmail thread or a Message-ID the letter's email
  has, the politician plus its subject, for an automatic one the time, then a form
  letter's sender in the text, and when stuck the original it quotes. A person's is
  kept whole, an automatic one is an event on the letter. Anything else is a
  one-off email.
- **Letters whose text we can't read.** The August 2025 DeepMind letters went from
  Joseph's personal Gmail, which the site can't read. Their template is the "join
  40" mailing's, and each letter's own paragraph that of the person's latest letter
  before it, marked `imported_text_approximate`, and a letter's page says it's not
  exactly what they received. The one such email found matches that, and replies
  quoting others say "join 40" until 7 August and "join 50" from the 8th, so its
  number goes by its date. The mailing says it's from Joseph, with no address.

## One-off emails

Threads with a politician that aren't a letter of a campaign or mailing: Joseph's
own emails, a volunteer copying policy@, an MP writing to us. Kept whole, in
Netlify Blobs with a row in `one_off_messages`, in `one_off_threads`, by
`lib/server/one-off-emails.ts`; read-only at `/staff/one-off`, in the
navigation under Politicians, and on the politician's and supporter's pages.

- **What counts** (`lib/one-off.ts`): a message with an address a politician has
  or has had (past ones from the audit log), one on a politician's own domain, or
  one on a parliament's. Politicians' own domains (`politician_domains`) come from
  the nightly check against Parliament's Members API, which saves those it lists,
  if only one politician has it and it isn't a party's or social media's. One
  message is kept once by its Message-ID, and threaded across mailboxes by
  In-Reply-To and References, as each has its own Gmail thread IDs. A thread that
  counts is kept whole, within the mailbox it was found in: what came before the
  message that counts and what comes after, whoever wrote it.
- **Quotes.** The forwarded or quoted From, Sent, To and Cc also say a thread is
  with a politician. As volunteers forward their emails to us, policy@ and the
  group's archive, which are shared mail, are searched this way. Joseph's other
  mail isn't: it's found by its headers alone, to keep the rest of it private,
  apart from the threads found.
- **Catching up.** The import, last of all, asks Gmail for every thread kept in
  its two mailboxes, whichever read kept it, and keeps what's missing, a press
  going through them all again.
- **New threads.** The regular read keeps policy@'s and joseph@'s threads by the
  same rule (`keepsPoliticianThreads`), fetching the rest of the Gmail thread with
  each message it keeps, and `/staff/me` says so once they're connected. Everyone
  else copies policy@ into theirs.
- **Mail that matches nothing,** in policy@ and the group's archive, isn't kept
  unless its thread comes to be, only its Gmail ID (`unmatched_mail`), to list its
  sender and subject, read again from Gmail, in an email to the notification inbox:
  at most once a day, whether or not the last try's email went (`tried_at`), and
  the oldest 100 at a time, saying how many more wait. The import
  lists what it finds on its results instead, for staff with `supporters`.
- **Who sees what.** Staff without `supporters` see the name and text of a thread
  only if every sender in it is a politician, on a parliament's domain, or one of
  PauseAI's accounts (the connected Gmails, and `PAUSEAI_ALIASES`). Anyone else
  writing in it (`someone_else`) hides it from them.

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
them by supporter (Luma's activity is three arms of `supporter_activity`
itself, as Postgres can't narrow a union inside a join to one supporter),
and `supporters_summary` is one row per supporter. The list reads
`supporters_listed`: `supporters_list`, a materialized view of every
supporter's summary and place, refreshed by `refreshSupportersList()` at
the end of each import that links supporters and by an erasure, and anyone
added since, worked out as it's read. So a supporter's counts, tags and
place in the list are as of the last import, up to an hour old, but for whether they're a Luma contact: an opt-out from the
calendar, or its end, is looked up as the list is read
(`optedOutOfLuma()`). Their own page is always as they are now. When a supporter was first seen, the earliest `seen_at` of their
records (`supporter_first_seen`), is kept on the supporter
(`supporters.first_seen_at`) by `refreshSupporterFacts()`
(`lib/server/supporter-facts.ts`), which `linkSupporters()` runs, so the
staff home counts new supporters by it without working it out each time. Only staff with the `supporters` permission see them
(`/staff/supporters`), and each download of a list of them (supporters,
their blocked addresses) is an audit log entry.

Where they come from:

- **Luma.** The import, every 5 minutes (`lib/server/luma-import.ts`), copies every
  public event on our calendar into `luma_events`, each registered guest
  into `luma_guests` (phone, a postcode answer, `utm_source`; never Luma's
  invited-only rows), each of our own events' hosts into
  `luma_event_hosts` (from Luma's details of the event, as its list has no
  hosts: every past event's read once, and each still to come every hour until
  its day is over) and every Luma user, guest, host or contact, into
  `luma_people`, with when they joined the calendar as a contact and when
  a read of the contacts last listed them. Luma's own IDs are the keys, and
  only the import writes these tables. The site's events pages still read
  Luma live. A run fetches for about 20 seconds, reading what's changed
  first and backfilling the rest over later runs, and records how many
  events are still waiting, so the first copy of the calendar takes a few
  runs. It leaves 50 of Luma's 200 requests a minute for the site's own
  fetches, and stops early if Luma answers 429. A run that changed nothing
  doesn't work out every supporter's facts and the supporters list again
  unless no run has in the last hour, as with many supporters they take a
  few seconds.
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

**Where they are.** The `supporter_place` view gives each supporter's
best-known place, with its coordinates, country and the postcode's
constituency: their newest postcode, else the newest city they gave
themselves (never Luma's, whose cities are its events'), else the newest
event they registered for that isn't a big day or online. Each postcode
and town is looked up at postcodes.io once, at the end of each Luma
import, and kept in `postcode_places` and `named_places`
(`lib/server/supporter-places.ts`); a big import catches up over a few
runs. The list's Near filter and a supporter's MP read it, and the
supporter's page shows the cities they gave (`givenPlaces()` in
`lib/supporter-place.ts`).

**Erasure.** When someone asks to be forgotten, staff erase the supporter
from their page (`lib/server/erasure.ts`), under the request's reference.
For each source, what that source holds goes: a form entry, with its
letter, the letter's events and the copies of replies forwarded to the
sender, its row in the send log keeping only that a letter went to that MP, and for one from the letters inbox, the supporter's proxy, every
message kept and its blob, its mail there moved to Trash; a Luma user with their
registrations and contact; a member's record; every one-off email with their
address on it, and its blob. What stays is what exists to stop us mailing
the address: `email_problems`,
`email_blocks` and `opt_outs`. The Luma user's ID goes in `luma_erased`,
which the import skips, so they never come back; a new Luma account later
is a new supporter. A member's record ID goes in `members_erased` in the
same way, and a one-off email's Gmail ID and hashed Message-ID in `one_off_erased`,
so that reading its thread again doesn't keep it again. The audit log entry carries the supporter's ID and the
reference, never a name or address. Luma's own records, the copies of
letters and replies in the policy team's Gmail inbox, and letters sent
through the earlier form in Airtable ("Web form emails") and Stichting
PauseAI's own copy of a member aren't reached from here: an erasure has to go there by hand (`docs/data-protection.md`).

A new source is a table of its own, a column and a widened `CHECK` on
`supporter_links`, its three views and its arms of the union views, a
badge, and its part of erasure.

## Events and their owners

Our events are Luma's, as the import copies them every 5 minutes (`luma_events`);
the staff interface's events page (`/staff/events`) lists our own as a
table, on a Future tab, soonest first, and a Past tab, latest first, with
how many are going, sorted and filtered there (`lib/staff-events-list.ts`).
Staff who see supporters see each event's hosts too, by name, each linked
to their supporter, and can search by their names and emails; a host's
supporter page lists the events they hosted, beside those they registered
for, each dated when the import first found them a host of it, or, for a
host since its first read, when it was made on Luma (Luma doesn't say when
someone became a host). Each can have one owner on staff
(`event_owners`, `lib/server/staff-events.ts`), kept apart from
`luma_events` as only the import writes that. Any staff member can make
anyone with a staff account an event's owner, from the page, but can't
take an owner away. One email goes to the new owner, whoever chose them,
copied to the one before, saying who gave it to them and from whom, and
the page says whom it emailed. At the end of each import,
every event still to come with no owner gets one by the rules in
`lib/event-owners.ts`, written there for now: by the place in its city or
Luma tags, or else a default owner. Each owner is emailed once, listing the
events they were given. Someone the rules name who has no staff account
gets nothing, and the event stays with no owner, shown on the page as an
error until someone takes it (not once it's past, or taken off Luma). A staff account removed takes its events
with it, and the next import gives them their owners by the rules again.

Each event can have a link to its Google Doc too (`event_docs`): any staff
member can set, change or clear it on the page, a link to Google Docs or
Drive only. No one is emailed about it, but the audit log keeps who did.

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
  number on a record from then with no intent is a yes too. One with
  another intent, or with none on a later record, is unsure.
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
goes through `send()` with its purpose: `letter`, `letter-copy`, `relay`,
`supporter-notice`, `office-notice`, `forwarded-reply`, `staff-login`,
`staff-alert`, `staff-report`, `mailing` or `mailing-test`. Each try is
logged (`email_sends`): when, why, to whom, whether it went, and which
backend sent it, Postmark or a connected Gmail, a staff member's or the
letters inbox ("Mailings to politicians" and "Letters through the letters
inbox", above), its subject and its From address. An `imported` row is a letter
Joseph sent, read from his Sent mail. Admins read them at `/staff/sent-emails`
(`lib/server/sent-emails.ts`), with no visible heading, as the menu names it:
someone outside PauseAI as their name, linked to their page, through the row's
letter, or by the address if only one person has it; its outcome, bounced or a
spam complaint from `email_problems`; a link to its letter and its campaign or
mailing. A row never shows the email's text. An admin without `supporters` sees only
the kinds with no supporter's details on them (`SENT_EMAILS_WITHOUT_SUPPORTERS`),
and a line saying the rest aren't shown.

Every address an email is to, Cc'd or Bcc'd to has a name with it: the
person's own name on their own address, `"Jane Smith"
<jane.smith@example.com>`, and their name with "(via PauseAI)" on a proxy
(`nameLine` and `proxyLine` in `lib/server/proxies.ts`). The exception is
staff: we don't know a staff account's name, nor a shared inbox's, so a
login link, an alert or an event owner's email goes to the address alone.

When something needs a person, the site emails the notification inbox,
`NOTIFICATION_INBOX` (`notifyStaff` in `lib/server/notifications.ts`), once
each time it happens, with a link to where to deal with it:

- an MP's address bouncing a letter or relay (`lib/server/delivery-problems.ts`);
- mail in the letters inbox it can't relay (`lib/server/gmail-reading.ts`);
- an import failing, after a run of it that didn't (`recordFailure` in
  `lib/server/import-runs.ts`);
- a Gmail account the read every 5 minutes couldn't read, after a run that could
  (`lib/server/gmail-reading.ts`); one Google disconnected has its own;
- the MP import held, when none was (`lib/server/politician-sync.ts`);
- Google disconnecting a Gmail account (`lib/server/gmail-accounts.ts`);
- letters to MPs waiting over three hours to go, until those it named
  have gone (`LATE_HOURS` in `lib/server/letter-sending.ts`);
- once a day at most, a report of the supporters' copies that bounced
  since the last, each address's domain and what its server said, and
  how many replies to them are held (`lib/server/held-replies.ts`), to
  see whether the form should check addresses harder.

The backup Worker emails its own problems, to its `ALERT_TO` (`backup/README.md`).

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
letters, Go to Parliament's meetings and old letters; and the two jobs that
don't import but run on a schedule all the same, the hourly sending and the
nightly tidying (`IMPORT_JOBS` in `lib/import-runs.ts`). Whatever a scheduled
job does, it goes here, despite the name (`docs/code-structure.md`). Each runs on a
schedule or when staff press its button, and every run is recorded
(`import_runs`): when, who started it (`nightly` or a staff email), how it
ended, why it failed, what went wrong along the way without stopping it
(its problems, `lib/server/problems.ts`, each a fixed sentence with any count or list as its error), and the job's own account of what
it found. A run with problems is amber, "Problems", and lists them under its
line; staff are emailed about a failure, or a problem the run before didn't
have, once, until a run goes right (`lib/server/import-runs.ts`). A problem
with an alert of its own, such as a Gmail account Google disconnected, is
marked told, so the run's email leaves it out. A run can be held for staff
to decide on, as a large politician sync is. `/staff/import-data` shows each job's newest run on a card, and each
job's own page (`/staff/import-data/<slug>`, `importPath()` in
`lib/import-runs.ts`) its button and every run it keeps: a week of a
5-minute job's, a month of a nightly one's, a one-off job's last 50, and
always its newest and a held run (`lib/server/log-retention.ts`, run
nightly).

Pressing a job's button marks it running (`job_presses`) until it finishes, or
for 16 minutes if it dies, and its page says so: a second press of that job meanwhile
starts nothing. Scheduled runs don't take a press; the Luma import and the import
of old letters each take a lock, so a press can't overlap a scheduled run.

A job's page shows its runs under a heading for each day (`lib/run-log.ts`).
A job that runs every 5 minutes or hourly makes hundreds a day, nearly all
alike, so its runs that found nothing are gathered together, its routine runs
(the import of old letters, Luma's and the Gmail reading) are counts, and
anything else, a failure above all, shows whole. How a page lays that out is in
the style guide ("A job's log"). The import of old letters also says how far it
has got.

A new job is a name in `IMPORT_JOBS` and the `import_runs` CHECK, a result
type, a function that runs it inside `keepingFailure()` and records its run,
a slug in `IMPORT_SLUGS`, its icons (`ImportIcon.tsx`, where it reads from)
and description in `ImportJob.tsx`, its button's Server Action in the job
page, and a scheduled function if it runs on a schedule. A job that has more to do
than a run allows, as the Luma import has, keeps its place and says in
its result what's left.

## Saved filters

A saved filter is a staff list's filters under a name, for everyone who can
open that list (`saved_filters`, `lib/server/saved-filters.ts`, and
`ui/SavedFilters` for how it looks). Politicians, Supporters and Events have
them. Anyone who can open the list can update, rename or delete any of them,
and the audit log records each change by its ID and list, never its name or
parameters, which can name a supporter.

It holds the list's URL parameters (`savedParams()`, `lib/saved-filters.ts`):
the search and every filter, the tab and the sort, never the page or who a
mailing is being chosen for. This isn't `FILTER_LISTS`, which is the lists a
mailing can be to.

Filters live in the URL, so loading one is a link to its parameters and
`saved=<id>`, which every link in the bar keeps. Nothing is held in the
browser: each page compares its URL with the filter it names, ignoring
order and blanks, to know whether it's been edited. An ID that's unknown,
deleted or another list's loads nothing. A value that no longer exists
(`filterProblems()`) is left out of the list, says so over it and doesn't
count as an edit; saving an edit to the filter takes it out for good.

Erasing a supporter takes their exact names, emails, phone numbers and
postcode, ignoring case, out of every saved filter's name and typed
parameters (`docs/data-protection.md`).

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

| Action                                                                                                        | Actor                                | When                                                                                            | Details name                                                 |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `add politician`                                                                                              | `sync`                               | The politician sync adds a politician                                                           | `id`, and their details                                      |
| `edit politician`                                                                                             | `sync`                               | The politician sync changes a politician's details, or their record is back                     | `id`, `name`, and each field `changed`, before and after     |
| `remove politician`, `delete politician`                                                                      | `sync`, staff                        | The politician sync finds a record no longer in Airtable; staff delete one gone                 | `id`, `name`                                                 |
| `set status`                                                                                                  | staff, `controlai`, `airtable`       | A status set or cleared, by hand or by an import                                                | `politicianId`, `ask`, `status`, `date`, `note`              |
| `apply politician sync`, `hold politician sync`, `apply held politician sync`, `discard held politician sync` | `sync`, staff                        | Each sync's outcome, and each decision on a held one                                            | counts, or the run's `id`                                    |
| `copy PauseAI emails`                                                                                         | `sync`                               | The Emails sync adds any                                                                        | `added`                                                      |
| `import web form letters`, `import Go to Parliament`                                                          | staff                                | The one-off imports of pauseai.info's letters and of the meetings                               | counts                                                       |
| `import ControlAI letter`                                                                                     | `controlai`                          | A read of the letter that set or cleared any status                                             | counts                                                       |
| `add ask`, `edit ask`, `delete ask`                                                                           | staff                                | The asks pages                                                                                  | `slug`, and the ask's fields                                 |
| `add note`, `edit note`, `delete note`                                                                        | staff                                | A note on a politician or a supporter                                                           | `noteId`, and whose it is                                    |
| `create mailing`, `schedule mailing`, `reschedule mailing`, `stop mailing`, `delete mailing`                  | staff                                | A mailing written on the site                                                                   | `id`, and `recipients`, `dueAt` or what it `was`             |
| `start mailing`, `finish mailing`                                                                             | `send-mailings`                      | The hourly job starts a scheduled mailing, and sends its last letter                            | `id`                                                         |
| `set event owner`, `set event doc`                                                                            | staff, `sync`                        | An event's owner or Google Doc set on the events page, or an owner given by the rules           | `eventId`, `owner` or `url`, `previous`                      |
| `block address`, `unblock address`                                                                            | `postmark`, staff                    | A bounce or complaint blocks an address; staff unblock it                                       | `address`, and the `kind` or the `note`                      |
| `add staff account`, `set staff permissions`, `remove staff account`, `end staff sessions`                    | staff, or the address on first login | The accounts page, a first login, and sessions ended from the accounts page or `/staff/me`      | `email`, the permissions `from` and `to`, or `sessions`      |
| `connect gmail`, `disconnect gmail`                                                                           | staff                                | A Gmail connected or disconnected on `/staff/me`, or by Google                                  | `email`, and `why`                                           |
| `download supporters`, `download blocked emails`                                                              | staff                                | A list of supporters, or of blocked addresses with theirs, is downloaded, as CSV, JSON or vCard | the list's `filters` in words, the `format`, how many `rows` |
| `erase supporter`                                                                                             | staff                                | A supporter is erased                                                                           | `id`, the request's `reference`, and what went               |

Entries from before asks and the politician sync keep their own names: a
status set by `campaign`, `apply MP sync` and the rest, and `import
signatories from Airtable`. So do `view supporter` entries, from when each
opening of a supporter's page was logged (`id`), and `download letters`,
from when letters had a download of their own.

Details don't name a supporter: one is given by `id`, and an erasure by its
reference, so the log stays after the person is gone. A blocked address may be
a supporter's, and a download's filters may name one. A politician's details
are public, so theirs are logged in full.

An admin without `supporters` sees the log, and its download, without the
entries about a supporter, downloads, or addresses that aren't a politician's
(`WITHOUT_SUPPORTERS` in `lib/server/audit.ts`), and a line saying so. A new kind
of change that names a supporter's details needs adding there.

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
audit log and the sent emails. `admin` doesn't include `supporters`. An MP's page is the one
page that shows less without a permission: without `supporters`, its
letters come from a query that doesn't select their senders, so none reach
the browser. `admin@pauseai.uk` starts with an account and the admin
permission, as an ordinary row the migration adds. Removing an account ends
its sessions; the last admin can't be removed or lose admin.

The accounts page shows when each account was added and by whom (or by
its login), when it last logged in and was last seen (`last_login_at` and
`last_seen_at`, kept on the account, as sessions are deleted when they
end), and its sessions open, which an admin can end. Anyone logged in on
more than one device sees how many under Log out. Their address in the
navigation links to their own page (`/staff/me`): their sessions, where
they can end them all, and their Gmail, which they connect there to send
mailings from (below, "Mailings to politicians").

Each page in the navigation, and so each page under it, has the permission
`lib/staff-sections.ts` gives it, and asks for it in `requireStaff()`: an
account (the default) or a permission.
`tests/checks/staff-auth.test.ts` checks the two agree, and the
`permissions` storyboard section checks that, with no permissions, no page
holds a supporter's name or email. Every change to an account is an audit
log entry.

A new permission is a name in `PERMISSIONS` and the table's `CHECK`, and the
pages it opens given it in `STAFF_SECTIONS`.

A link in the navigation shows a "new" tag for 3 days after that person first
sees it (a dot on the folded rail), for any page added to `STAFF_SECTIONS`, with
nothing else to do. `staff_nav_seen` has a row for each account and page, with
when they first saw it; the signed-in layout adds those they have none for
(`lib/server/staff-nav-seen.ts`). A new account has none, so its pages are marked
as long since seen; a permission gained opens pages that are new to them. The
layout is kept between pages, so the tag goes at the next full page load.

## The public site's content

The rest of the site is content more than data: people's stories, local
groups and their pages, press coverage, blog posts, the board
(`lib/content/`). Events are the exception: Luma's calendar is the source
of truth, and the public pages read it live; the copy the import keeps is
for the supporter pages, not for them.
