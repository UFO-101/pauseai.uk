# Politicians and mail from PauseAI

Two features, the second built on the first:

1. **Politician data.** Everything in Airtable's "UK Politicians" base
   comes into our database: all five bodies, everyone who has left, what
   each has signed or agreed to, every email PauseAI has sent them, and
   the letters the public sent them through the old web form.
2. **Mail from PauseAI to politicians.** Staff filter the politicians
   page, press "Mail these", write one mail and schedule it. It goes from
   their own Gmail, and the whole thread can be read in `/staff`.

Three phases, one pull request each:

| Phase               | What staff get                                                               |
| ------------------- | ---------------------------------------------------------------------------- |
| 1. Data             | Every politician, past and present, with their asks and every letter to them |
| 2. Mail politicians | Mailings sent from Gmail, with bounces and whole threads                     |
| 3. Leave Airtable   | Politicians edited in the site; the Airtable sync stops                      |

## Rules

- **Airtable is read, never written.** It's the master copy until phase 3.
  Mail sent from the site isn't in Airtable, so its "Email count" and
  "Most recent email" undercount until then.
- **We keep a full history of everyone** (`docs/domain-concepts.md`). A
  politician who leaves office is marked, not removed. Imported data says
  where it came from.
- **We keep the text of PauseAI's letters and their replies**, but not of
  supporters' letters or their replies.
- **The database enforces everything**: typed columns and constraints. No
  key/value fields and no tags; a new marker is a column.

## Data model

Two parent tables. Each holds what all its kinds share, and a child row
adds what only its kind has, one to one:

```
notable_people ─── politicians       (later: journalists, famous people)

letters ──┬── supporter_letters
          └── pauseai_letters
```

Everything else points at them, many to one:

```
ask_statuses ──→ notable_people, asks
letters ───────→ notable_people, asks
pauseai_letters → mailings
letter_events ──→ letters
letter_messages → pauseai_letters
```

A child row joins its parent by a composite foreign key `(id, kind)`, so
it can only be the kind its parent says. Links point at the parent, so a
new kind, such as journalists, adds a child table and changes nothing
else.

### People

- **`notable_people`**: everyone we campaign at. Kind (`politician` for
  now), name, salutation, email, status, notes, `important_target`,
  `personal_connection`, `airtable_id`, `airtable_removed_at`. Status
  replaces `sitting`: `in_office`, `died`, `retired` or `left_office`.
- **`politicians`**: house, constituency, party, forename, surname,
  country, city, test postcode.

Supporters stay separate. They're merged from several sources
(`supporter_links`); notable people aren't.

### Asks

An ask is something we ask people to do whose answer we record: sign a
letter, come to an event.

- **`asks`**: slug, title, kind (`letter` or `event`), date. A migration
  adds each.
- **`ask_statuses`** (was `campaign_statuses`): one person's answer to one
  ask, with a date, a note, and who set it. A foreign key on
  `(kind, status)` allows only the statuses of the ask's kind:

  | Kind   | Statuses                                                                                              |
  | ------ | ----------------------------------------------------------------------------------------------------- |
  | Letter | `signed`                                                                                              |
  | Event  | `going`, `tentative`, `meeting_staff`, `tentative_staff`, `declined`, `declined_surgery`, `passed_on` |

  Whoever set a status owns it: staff, or an import (`airtable`,
  `controlai`). An import changes only its own, and leaves alone a status
  staff have set: our database wins. For now that only arises on
  `frontier-ai-letter`, the one ask staff mark in the site; the rest are
  past.

- **Campaigns** stay in `lib/content/email-your-mp.ts`, each naming one
  ask, and which status counts as done: `regulate-letter-pm` asks for
  `frontier-ai-letter` and `support-sobel-bill` for
  `controlai-statement`, both `signed`. A test checks every ask named in
  code exists.

### Letters

- **`letters`**: every letter to a notable person. Kind (`supporter` or
  `pauseai`), the person, the ask, created and sent times, status, our
  `Message-ID`, and the provider's message and thread IDs. A supporter's
  letter must have an ask; PauseAI's may not, as an invitation may ask
  nothing we record. `letter_events` (sent, skipped, bounced, replied,
  auto-reply) and `email_sends.letter_id` point here.
- **`supporter_letters`**: the sender's name, email, address, postcode,
  consent and `reply_hash`. `supporter_links` points here, and erasure
  deletes the row.
- **`pauseai_letters`**: the mailing, the sender, and the values merged
  into the template for this person.
- **`mailings`**: one mail to many people. Title, ask if any, subject,
  body template, attachments, sender, who made it, when it's due. A
  person's mail is re-rendered from the template and their merge values,
  not stored. The mailing keeps the rendered template it was sent with,
  so a change to the renderer can't change it. Mailings imported from
  Airtable have no template, which a CHECK allows only for them.
- **`letter_messages`**: every later message in a PauseAI letter's
  thread, the politician's replies and the sender's answers. From, date,
  subject, `Message-ID`, attachment names, and the key of the raw message,
  gzipped with its attachments, in Netlify Blobs. A reply to a supporter's
  letter is forwarded and logged as an event, as now, but not stored.

Letters record the ask, not the campaign. The Letters to MPs filter, the
one-letter-per-sender rule (now per ask) and a supporter's activity all
use the ask. If two campaigns ever share an ask, a `campaign` column can
come back.

## Phase 1: Data

1. **Parent tables and renames.** Add `notable_people` and point every
   reference to a politician at it (letters, statuses,
   `politicianHistory`). Split the sender's details off `letters` into
   `supporter_letters`, and point `supporter_links`, the supporter views
   and `email_permissions` there. Rename `campaign_statuses` to
   `ask_statuses` and add `asks`. Its own commit, as it touches a lot of
   code.
2. **Status instead of `sitting`.** Email your MP and every filter that
   meant sitting now mean `in_office`.
3. **Sync every body.** `sync-politicians` replaces `sync-mps`: all of UK
   Parliamentarians, nightly, keyed by Airtable record ID.
   - A large change is held for a person to check, as now. So is a name
     change on an existing record, which may be Airtable reusing it for
     someone new.
   - Records ticked Test are skipped. The site keeps its own test MPs
     (`lib/test-mps.json`).
   - A record deleted from Airtable keeps its status and gets
     `airtable_removed_at`.
   - Notes go into `notes`, with a line "Recommended" for the 15 ticked
     so. Important target (98) and Personal connection (7) go into their
     columns.
4. **Statuses**, owned by `airtable`, replacing
   `lib/server/signatory-import.ts`:

   | Airtable field                     | Politicians                      | Ask                                          |
   | ---------------------------------- | -------------------------------- | -------------------------------------------- |
   | Signed Frontier AI Letter          | 10                               | `frontier-ai-letter`                         |
   | Signed DeepMind Letter             | 63                               | `deepmind-letter`                            |
   | Signed Liability Letter            | 0                                | `liability-letter`                           |
   | ControlAI Signatory                | 167                              | `controlai-statement`, from ControlAI as now |
   | Edinburgh Conference November 2026 | 50 Declined, 1 Passed on request | `edinburgh-conference-2026`                  |
   | Parliament meeting 23 June 2026    | 1                                | `parliament-meeting-2026-06-23`, `going`     |
   | London 2026 Panel                  | 4                                | `london-2026-panel`, `going`                 |

   Not imported: Responded and Declined on the letters; "Responded PauseAI
   Documentary Screening invitation" (2), which has no ask; "Sent DeepMind
   letter publication email", which the Emails sync covers; the
   per-person PDFs; the AI "Custom sentence".

5. **Emails sync** into `pauseai_letters`, nightly, adding rows by
   Airtable record ID. Airtable has no text, so a row records who, when,
   and Personalized and AI Generated. Each Airtable mailing becomes an
   imported `mailings` row:

   | Airtable's mailing                     | Emails | When         | Ask                         |
   | -------------------------------------- | ------ | ------------ | --------------------------- |
   | None ticked                            | 4,369  | Jun–Aug 2025 | `deepmind-letter`           |
   | Documentary Invitation                 | 703    | Oct 2025     |                             |
   | Westminster Hall Debate Invitation     | 341    | Dec 2025     |                             |
   | Edinburgh Conference Nov 26 Invitation | 186    | Oct 2026     | `edinburgh-conference-2026` |
   | Ben Lake October 2026 Debate           | 72     | Oct 2026     |                             |
   | CSRB Iqbal Amendment                   | 12     |              |                             |

   The unticked emails are the DeepMind letter and its follow-ups: 1,304
   of the 1,307 politicians with a DeepMind Letter PDF got them, most
   three or four each, and nobody else did.

6. **Import web form letters, once**, into `supporter_letters`, so their
   senders become supporters. They came from pauseai.info's old UK tool
   (`/uk-email-mp`, 18 July 2025 to 19 October 2026), which wrote each
   letter to Airtable for an automation to send. We import the 718 that
   were sent and skip 13 marked spam, invalid or unsent. The consent box
   arrived on 23 September 2026, so the 651 earlier letters count as no
   consent. A letter already in `letters` (same sender, politician and
   ask) is skipped.
7. **Import Go to Parliament, once.** Each MP a constituent was booked to
   meet gets a status on `go-to-parliament-oct-2026` (20 October 2026, the
   House of Commons) from "MP Meeting Status". Nothing about the
   constituent is imported.

   | MP Meeting Status                | Status             |
   | -------------------------------- | ------------------ |
   | Secured                          | `going`            |
   | Tentative yes                    | `tentative`        |
   | Meeting with staff               | `meeting_staff`    |
   | Tentative meeting with staff     | `tentative_staff`  |
   | Declined                         | `declined`         |
   | Declined but surgery appointment | `declined_surgery` |

   Edinburgh's answers map the same way: Going, Declined, and Passed on
   request (`passed_on`).

### Staff pages

- **Politicians**: filters for body, status, party, important target,
  personal connection, removed from Airtable, and signed or not signed an
  ask; columns for status and asks signed.
- **A politician's page**: status; each ask's status with its note and
  who set it, or "from Airtable"; supporter letters; PauseAI letters, with
  date, ask and whether personalised. Setting a status (Signed for a
  letter, a select for an event) takes a note.
- **Letters to MPs**: supporter letters only, imported ones marked.
- **Supporters**: web form senders, with the web form as their source.
- **Asks** (`/staff/asks`, new, read-only): each ask, its kind and date,
  and how many people have each status.
- **Import**: `sync-politicians`, the Emails sync and both one-off
  imports, with run, hold and apply like the other jobs.
- **Changes**: the new audit actions, also listed in
  `docs/domain-concepts.md`.

### Tests

The politicians filters. A politician's page with statuses from Airtable,
one who has left office, and imported PauseAI letters. A sync held for a
changed name. Each one-off import.

## Phase 2: Mail politicians

### Backends

All the site's mail goes through `send()` in `lib/server/email.ts`, which
checks blocks and logs to `email_sends`. `send()` takes a backend:

- **Gmail, as the staff member.** Reads as personal mail, lands in their
  Sent folder, and replies come back to them. About 2,000 a day per person
  ([limits](https://support.google.com/a/answer/166852)).
- **Postmark**, as now. Made for volume, but reads as bulk mail, and bulk
  mail on its broadcast stream must carry an unsubscribe link
  ([message streams](https://postmarkapp.com/message-streams)).

Mailings to politicians go by Gmail only. They're like one letter with a
big BCC, so they have no unsubscribe link. Postmark's broadcast stream is
for bulk mail to supporters (`plans/supporters-email.html`), which uses
the same backends.

In code, `MailBackend` is a type (send one email; how many more today),
and `postmark(stream)` and `gmail(staffAccount)` return plain objects of
that type. The fixture outbox is a third. `email_sends` records the
backend and sender address.

### Steps

1. **Try Gmail by hand.** From a test account, send to a domain that
   doesn't exist, a mailbox that doesn't exist, and an auto-replying
   address, and save what comes back, anonymised, as fixtures for the
   parsers. Check that
   `https://mail.google.com/mail/u/{sender}/#all/{threadId}` opens a
   thread from the API's thread ID; it isn't a documented URL.
2. **Backends**, as above.
3. **Connect Gmail.** Joseph, as Workspace admin, creates a Google Cloud
   project with an "Internal" OAuth consent screen, so only pauseai.uk
   accounts can grant it and Google needn't verify it
   ([user type](https://support.google.com/cloud/answer/15549945)).
   Scopes: `gmail.send` and `gmail.readonly`
   ([scopes](https://developers.google.com/workspace/gmail/api/auth/scopes)).
   Any staff account can connect. Its refresh token is stored encrypted.
4. **Mailings.** "Mail these", the editor, preview, test send, schedule.
   Scheduling fixes the recipients, one `pauseai_letters` row each. At
   send time, anyone whose address is blocked or who has left office is
   skipped and logged.
5. **The `send-mail` job**, hourly, in the database wake the other jobs
   share, so a mailing goes on the hour after its time. Each run sends
   what fits in 30 seconds
   ([limit](https://docs.netlify.com/build/functions/scheduled-functions/))
   and leaves the rest to the next. Gmail allows about 60 sends a minute
   per person
   ([quota](https://developers.google.com/workspace/gmail/api/reference/quota)).
6. **Gmail bounces and threads**, hourly. For each connected account,
   `users.history.list` since the last `historyId`
   ([docs](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list))
   gives the IDs of new messages and their threads. The site fetches only
   those in our letters' threads, and bounces; nothing else in the
   mailbox. Each is:
   - a **bounce**, from mailer-daemon or postmaster. It becomes a
     `DeliveryProblem` for `recordProblem()`, blocked and logged like a
     Postmark bounce. Bounces from remote servers may not join the
     thread; a search for
     `from:mailer-daemon OR from:postmaster newer_than:3d` finds them.
   - an **auto-reply**, with `Auto-Submitted` or similar, logged as an
     event;
   - otherwise a **message** in the thread, a reply or the sender's
     answer. It's fetched raw (`messages.get`, `format=raw`), gzipped into
     Netlify Blobs and recorded in `letter_messages`.
7. **Backups.** The backup Worker (`backup/`) pulls new blobs through a
   read-only route on the site. The site never writes to Cloudflare.

### The editor

Email your MP's editor (`lib/letter-format.ts`), plus fields filled in per
person and blocks shown only to some:

```
Dear {salutation},

I'm writing to invite you to …

[if signed frontier-ai-letter]
Thank you again for signing our open letter to the Prime Minister.
[end]
```

Attachments are the mailing's, the same for everyone.

### Staff pages

- **Your staff account**: Connect Gmail, saying what the site will and
  won't read in your mailbox; Disconnect; the connected address and
  today's sends against the cap.
- **Politicians**: a "not mailed for this ask" filter, and "Mail these",
  which opens a new mailing with the filtered list.
- **Mailings** (`/staff/mailings`, new):
  - the list: ask, sender, when, and counts sent, skipped, bounced and
    replied;
  - new and edit: recipients with untick boxes, subject, body,
    attachments, sender, time;
  - preview as any recipient, and a test send to yourself;
  - schedule and cancel;
  - a mailing's page, with every recipient's outcome.
- **A politician's page**: each PauseAI letter opens its whole thread:
  the letter as sent, then every message in order, with attachments.
  The sender also gets "Open in Gmail", opening the thread in a new tab;
  `/u/{sender}` in the link picks their account if they're signed in to
  several. Bounces.
- **Blocked MP emails**: bounces found in Gmail, marked as such.
- **Import**: runs of `send-mail` and the Gmail check.

### Tests

Connecting Gmail, against a fake Google. "Mail these" through to
scheduling, and a mailing's page after sending. A test politician whose
Gmail send bounces, shown on their page and in Blocked MP emails. A thread
on a politician's page with a reply and the sender's answer. The parsers
against the samples from step 1, each giving the right `DeliveryProblem`,
or none for a delay. The whole path from the history feed to a blocked
address to the next send refused, against a fake Gmail.

## Phase 3: Leave Airtable

Starts once the first two real mailings have gone from the site. Joseph
then stops editing Airtable, and this phase brings into the site what he
still does there.

- Staff add politicians, edit everything the sync owned, and change a
  status with the date and a note (a resignation, the by-election after).
  Airtable keeps these in Notes: 71 of its 106 notes record a status or
  party change with its real date and reason. Our audit log can't, as it
  only knows when the sync saw the change.
- Staff set any ask's status, not just those of `trackedCampaigns`.
- Asks are added on `/staff/asks`, if a migration each has become a
  nuisance.
- The syncs stop and leave the Import page. Politicians keep their
  `airtable_id`.
- Perhaps Parliament's member IDs, so a re-elected member's two records
  can be merged.

## Across all phases

Every step keeps 100% coverage. New pages get storyboard flows, gallery
examples for new components, and a line in `docs/testing.md`.

Data protection, agreed before building and recorded in
`docs/data-protection.md`, the privacy policy and erasure:

- **Web form senders**: a new source of supporter letters (name, email,
  postcode, consent, not the message), erased like any supporter letter.
- **Staff mailboxes**: `gmail.readonly` lets the site read a connected
  mailbox whole. It reads only the IDs of new messages, and fetches only
  those in our letters' threads and bounces. Tokens are encrypted, and
  deleted when a staff member disconnects or their account is removed.
- **PauseAI letters and politicians' replies**: kept in full, as public
  figures in their public role. A reply may mention a constituent or a
  member of staff; we keep it anyway, and the policy says so.
- **Google**: a processor for staff mail, as it already is for the policy
  inbox.

## Not in these phases

- A custom sentence per person, and PDFs per person.
- Open tracking. Gmail would need a tracking pixel, which looks like spam,
  and Apple Mail fakes opens anyway.
- Follow-ups sent by the site, and leaving out anyone we've been in touch
  with in the last six months.
- Recording what a reply said, and the workflows built on it: mass mail
  with reminders, and running an event like Go to Parliament.
- Mailings bigger than Gmail's 2,000 a day: Gmail sending over several
  days, or Postmark's broadcast stream with an unsubscribe link.
- Tags, and fields staff add themselves. Joseph adds fields in Airtable to
  attach a file to an email, track replies to it, and track who's coming
  to an event. Mailings, threads and asks cover those; we'll see what's
  missing once they're in use.
- A permission for sending mailings, if one is needed.
- Journalists and famous people.
- Bulk mail to supporters (`plans/supporters-email.html`).

## Waiting on Joseph

- **The Google Cloud project** (phase 2, step 3).
