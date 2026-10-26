# Politicians and mail from PauseAI

Two features, the second built on the first:

1. **Politician data.** Everything in Airtable's "UK Politicians" base
   comes into our database: all five bodies, everyone who has left, what
   each has signed, every email PauseAI has sent them, and the letters the
   public sent through the old web form.
2. **Mail from PauseAI to politicians.** On the politicians page, staff
   filter to the people they want, press "Mail these", write one mail and
   schedule it. It goes from their own Gmail, or from Postmark for big
   sends.

It's built in three phases, one pull request each:

| Phase                | What it gives staff                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------ |
| 1. Data              | Every politician, past and present, with what they've signed and every letter to them      |
| 2. Mail politicians  | Mailings from the politicians page, sent by Gmail or Postmark, with bounces and replies     |
| 3. Leave Airtable    | Staff edit politicians in the site, and the Airtable sync stops                            |

## Rules

- **Airtable is read, never written.** Until phase 3 it's the master copy
  and the site syncs from it. A mail sent from the site doesn't appear in
  Airtable's Emails table, so its "Email count" and "Most recent email"
  undercount until then.
- **We keep a full history of everyone** (`docs/domain-concepts.md`, "A
  full history of everyone"). Nothing is deleted because it stopped being
  current: a politician who leaves office is marked, not removed. Anything
  imported says where it came from, so a page can show "from Airtable".
- **Which letters' text we keep.** A supporter's letter and the reply to it
  aren't kept as text. PauseAI's letters and the replies to them are.
- **Everything is enforced in the database**: typed columns and
  constraints, no key/value fields.

## The data model

Two new parent tables. Each holds what every kind has in common, and
everything else points at it, so a new kind (journalists, later) changes
no other table.

```
notable_people ──┬── politicians                (later: journalists, famous people)
                 ├── ask_statuses ── asks
                 └── letters ──┬── supporter_letters
                               ├── pauseai_letters ── mailings
                               ├── letter_events
                               └── letter_replies   (PauseAI letters only)
```

**People and asks**

- **`notable_people`**: everyone we campaign at. Id, kind (`politician`
  for now), name, salutation, email, status, notes, `airtable_id`. Status
  replaces `sitting`: `in_office`, `died`, `retired`, `left_office`, or
  `removed_from_airtable` for a record that vanished from Airtable.
  Supporters stay separate: they're merged from several sources
  (`supporter_links`), which notable people never are.
- **`politicians`**: the politician columns only. House, constituency,
  party, forename, surname, country, city, test postcode. Its key is the
  person's id, and a composite foreign key `(id, kind)` keeps it on a
  `politician`.
- **`asks`**: what we ask people to do. A letter to sign or an event to
  come to. Slug, title, kind (`letter` or `event`), date. Each is added by
  a migration.
- **`ask_statuses`** (was `campaign_statuses`): a person's answer to an
  ask, with a date, a note, and who set it. A composite foreign key
  `(kind, status)` enforces which statuses each kind of ask allows:

  | Kind   | Statuses                                                                                         |
  | ------ | ------------------------------------------------------------------------------------------------ |
  | Letter | `signed`                                                                                         |
  | Event  | `going`, `tentative`, `meeting_staff`, `tentative_staff`, `declined`, `declined_surgery`, `passed_on` |

  Who set a status decides who may change it, as now: staff, or an import
  (`controlai`, `airtable`), which changes only its own.

- **Campaigns** stay in `lib/content/email-your-mp.ts` and name the ask
  that counts as done: `done: { ask: "frontier-ai-letter", status:
  "signed" }`. A test checks that every ask the code names exists.

**Letters**

- **`letters`**: every letter to a notable person, from anyone. Id, kind
  (`supporter` or `pauseai`), the person, the ask, when it was created and
  sent, status, our `Message-ID`, and the provider's message and thread
  IDs. `letter_events` (sent, skipped, bounced, replied, auto-reply) and
  `email_sends.letter_id` point here for both kinds.
- **`supporter_letters`**: what only a supporter's letter has. The sender's
  name, email, address, postcode, consent and `reply_hash`.
  `supporter_links` points here, and erasure deletes this row.
- **`pauseai_letters`**: what only PauseAI's has. The mailing, the staff
  member who sent it, the backend, and the values merged into the
  template for this person.
- **`mailings`**: one mail to many people. The ask, subject and body
  template, attachments, who made it, the backend, and when it's due.
  Each person's mail isn't stored, only their merge values, and it's
  re-rendered to show it. The mailing keeps the rendered template it was
  sent with, so a later change to the renderer can't change what it
  shows.
- **`letter_replies`**: a politician's reply to a PauseAI letter. From,
  date, subject, `Message-ID`, attachment names, and the key of the raw
  message, gzipped with its attachments, in Netlify Blobs. A CHECK allows
  replies only on `pauseai` letters. A reply to a supporter's letter is
  forwarded and logged as an event, as now, but not kept.

## Phase 1: Data

Each step is a commit or more, in this order.

1. **Parents and renames.** Add `notable_people` and move every reference
   to a politician to it (letters, statuses, `politicianHistory`). Split
   the supporter's details off `letters` into `supporter_letters`, and
   point `supporter_links`, the supporter views and `email_permissions`
   there. Rename `campaign_statuses` to `ask_statuses`, keyed by ask, and
   add `asks` with the asks below. Mechanical but wide, so it goes first,
   on its own.
2. **Status, not sitting.** Email your MP and every filter that meant
   "sitting" now mean `in_office`.
3. **Sync every body.** `sync-politicians` replaces `sync-mps`: all of UK
   Parliamentarians, keyed by Airtable record ID, nightly, still holding a
   big change for a person to check. A changed name on an existing record
   is held too: it could be Airtable reusing a record for someone new,
   which would hand the old person's history to them.
4. **Signed statuses** from Airtable's flags, owned by `airtable`, so the
   sync changes or removes only its own. `lib/server/signatory-import.ts`
   is folded into this.

   | Airtable field            | Politicians | Ask                                                       |
   | ------------------------- | ----------- | --------------------------------------------------------- |
   | Signed Frontier AI Letter | 10          | `frontier-ai-letter`, which `regulate-letter-pm` asks for |
   | Signed DeepMind Letter    | 63          | `deepmind-letter`                                         |
   | Signed Liability Letter   | 0           | `liability-letter`                                        |
   | ControlAI Signatory       | 167         | `controlai-statement`, still imported from ControlAI      |

   Not imported: Responded, Declined, the per-person PDFs and briefings,
   and the AI "Custom sentence".

5. **Emails sync** into `pauseai_letters`, nightly with the politicians.
   It adds rows by Airtable record ID and never touches rows the site
   sent. No text, as Airtable has none: who, when, the ask, and
   Personalized and AI Generated.

   | Airtable's mailing                     | Emails | When         | Ask                        |
   | -------------------------------------- | ------ | ------------ | -------------------------- |
   | None ticked                            | 4,369  | Jun–Aug 2025 | `deepmind-letter`          |
   | Documentary Invitation                 | 703    | Oct 2025     | `documentary-screening`    |
   | Westminster Hall Debate Invitation     | 341    | Dec 2025     | `westminster-hall-debate`  |
   | Edinburgh Conference Nov 26 Invitation | 186    | Oct 2026     | `edinburgh-conference-2026` |
   | Ben Lake October 2026 Debate           | 72     | Oct 2026     | `ben-lake-debate-2026`     |
   | CSRB Iqbal Amendment                   | 12     |              | `csrb-iqbal-amendment`     |

   The unticked emails are the DeepMind letter: 1,304 of the 1,307
   politicians with a DeepMind Letter PDF got them, and nobody else did,
   most of them three or four each (the letter and its follow-ups, told
   apart only by date).

6. **Once: Web form emails** into `supporter_letters`, so their senders
   become supporters (questions 1 and 2).
7. **Once: Go to Parliament.** For each MP a constituent was booked to
   meet, an event status on `go-to-parliament-oct-2026` (Tuesday 20
   October 2026, the House of Commons), from Airtable's "MP Meeting
   Status". Nothing about the constituent is imported.

| Go to Parliament's answer         | Status             |
| --------------------------------- | ------------------ |
| Secured                           | `going`            |
| Tentative yes                     | `tentative`        |
| Meeting with staff                | `meeting_staff`    |
| Tentative meeting with staff      | `tentative_staff`  |
| Declined                          | `declined`         |
| Declined but surgery appointment  | `declined_surgery` |

Edinburgh's answers are Going (`going`), Declined (`declined`) and Passed
on request (`passed_on`).

### Staff pages in phase 1

- **Politicians.** Filters for body, status, party, and signed or not
  signed an ask. Columns for status and asks signed.
- **A politician's page.** Their status. Each ask's status with its note,
  marked "from Airtable" or with who set it. The status control (Signed
  for a letter, a select for an event) gets a note field: the column
  exists, but the Signed button writes an empty note and there's nowhere
  to type one. Their supporter letters and PauseAI letters, imported ones
  with date, ask and whether personalised. For example: "Booked to meet a
  constituent at Go to Parliament, 20 Oct 2026 (from Airtable)".
- **Letters to MPs.** Supporter letters only; imported ones marked as from
  Airtable's web form.
- **Supporters.** Web form senders appear, with the web form as their
  source.
- **Asks** (`/staff/asks`, new, read-only). Each ask, its kind and date,
  and how many people have each status.
- **Import.** `sync-politicians`, the Emails sync and the two one-off
  imports, each with run, hold and apply like the other jobs.
- **Changes** (the audit log). New actions, added to the table in
  `docs/domain-concepts.md`.

## Phase 2: Mail politicians

### How sending works

Every email the site sends already goes through `send()` in
`lib/server/email.ts`, which checks blocks and logs to `email_sends`.
`send()` gains a **backend**, chosen per mailing:

- **Gmail, as the staff member.** It looks like personal mail and lands in
  their Sent folder, and replies come back to them. Workspace allows about
  2,000 a day per person ([limits](https://support.google.com/a/answer/166852)),
  and Gmail never tells us about spam complaints.
- **Postmark** (transactional or broadcast stream). Built for volume, with
  bounce and complaint webhooks, but it reads as bulk mail.

The new-mailing page suggests one from the count: Gmail for tens of
people, Postmark for hundreds. Staff can override it.

A backend is a `MailBackend` type (send one email; how many more it may
send today) with a function per backend, `postmark(stream)` and
`gmail(staffAccount)`, returning plain objects, not classes. The fixture
outbox becomes a third. `email_sends` records the backend and the sender
address. Supporter bulk mail (`plans/supporters-email.html`) uses the same
layer.

### Steps

1. **Real Gmail samples first.** From a test account, send to a domain
   that doesn't exist, a mailbox that doesn't exist and an auto-replying
   address. Save what comes back, anonymised, as test fixtures. The bounce
   and reply parsers are written against these.
2. **Backends**, as above.
3. **Connect Gmail.** A Google Cloud project owned by the pauseai.uk
   Workspace, with its OAuth consent screen set to "Internal", so only
   pauseai.uk accounts can grant it and Google needn't verify the app
   ([user type](https://support.google.com/cloud/answer/15549945)). It asks
   for `gmail.send` and `gmail.readonly`
   ([scopes](https://developers.google.com/workspace/gmail/api/auth/scopes)).
   The refresh token is stored encrypted on the staff account. Any staff
   account can connect; there's no permission for it.
4. **Mailings.** "Mail these" on the politicians page, the editor,
   preview, test send, schedule. The recipients are fixed when it's
   scheduled, one `pauseai_letters` row each. At send time, anyone whose
   address is now blocked or who has left office is skipped, and logged as
   skipped.
5. **The `send-mail` job**, every few minutes. It first reads only a
   Netlify Blob holding the next due time, so the database wakes only when
   there's mail to send. Each run sends what fits in its 30 seconds
   ([limit](https://docs.netlify.com/build/functions/scheduled-functions/))
   and leaves the rest for the next. The Gmail API allows about 60 sends a
   minute per person
   ([quota](https://developers.google.com/workspace/gmail/api/reference/quota)).
6. **Gmail bounces and replies**, hourly with the other jobs. For each
   connected account, `users.history.list` since the last `historyId`
   ([docs](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list))
   lists the new messages. A new message in one of our threads is one of:
   - **a bounce**, from mailer-daemon or postmaster: a `DeliveryProblem`
     to `recordProblem()`, so it lands in `email_problems` and
     `email_blocks` like every other bounce;
   - **an auto-reply** (`Auto-Submitted` and the like): an event;
   - **a reply**: fetched raw (`messages.get`, `format=raw`), gzipped into
     Netlify Blobs, and recorded in `letter_replies`.

   A remote server's bounce may not join the thread, so a search
   (`from:mailer-daemon OR from:postmaster newer_than:3d`) catches those.

7. **Postmark mailings' replies** come back the way supporter letters'
   do: to a `reply_hash` address on `letters.pauseai.uk`, through the
   inbound webhook. They're stored as above and forwarded to the staff
   member who sent the mailing.
8. **Backups.** The backup Worker (`backup/`) pulls new reply blobs since
   its last run, through a read-only route on the site. The site never
   writes to Cloudflare.

### The mail editor

The one Email your MP uses (`lib/letter-format.ts`), with fields filled in
per person and blocks shown only to some:

```
Dear {salutation},

I'm writing to invite you to …

[if signed frontier-ai-letter]
Thank you again for signing our open letter to the Prime Minister.
[end]
```

Attachments belong to the mailing and are the same for everyone.

### Staff pages in phase 2

- **Your staff account.** Connect Gmail and Disconnect, the address
  connected, and today's sends against the daily cap.
- **Politicians.** A "not already mailed for this ask" filter, and the
  "Mail these" button, which opens a new mailing with the filtered list.
- **Mailings** (`/staff/mailings`, new).
  - The list: ask, sender, backend, when, and how many sent, skipped,
    bounced and replied.
  - New and edit: recipients with untick boxes, subject and body,
    attachments, from, and when.
  - Preview for any recipient, and a test send to yourself.
  - Schedule and cancel.
  - A mailing's page: every recipient and what happened to their mail.
- **A politician's page.** Their PauseAI letters, each opening as sent;
  replies, opening the stored message with its attachments; bounces from
  either backend.
- **Blocked MP emails.** Bounces found in Gmail, marked as such.
- **Import.** Runs of `send-mail` and the hourly Gmail check.

## Phase 3: Leave Airtable

- Staff add politicians (they can't today), edit every field the sync
  owned, and change a status when someone leaves office.
- Staff set any ask's status by hand, not only those of
  `trackedCampaigns`.
- Asks can be added from `/staff/asks`, if a migration each has become a
  nuisance.
- The syncs stop and leave the Import page. Each politician keeps their
  `airtable_id`.
- Perhaps Parliament's member IDs on politicians, so a re-elected
  member's two records can be merged.

## Tests and the storyboard

Every step keeps 100% coverage. Each new page gets storyboard flows with a
frame after each thing a person sees, gallery examples for new
components, and its line in `docs/testing.md`. In particular:

- **Phase 1.** The politicians filters. A politician's page with
  statuses from Airtable, one who has left office, and imported PauseAI
  letters. A sync held because a record's name changed. Each one-off
  import's run.
- **Phase 2.** Connecting Gmail, against a fake Google. "Mail these" to a
  mailing, preview, test send and schedule. A mailing's page after
  sending. A test politician whose Gmail send bounces, shown on their
  page and in Blocked MP emails. A reply on a politician's page.
- **Bouncing**, on the real samples from phase 2's first step: each gives
  the right `DeliveryProblem`, or none for a delay. The whole path, from
  the history feed to a blocked address to the next send refused, runs
  against a fake Gmail.

## Data protection

To agree before building, in `docs/data-protection.md`, the privacy
policy and erasure:

- **Web form senders**: a new source of supporter letters, with name,
  email, postcode and consent, but not their message. Erased like any
  supporter letter.
- **Gmail tokens**: each connected staff member's OAuth refresh token,
  encrypted. Deleted when they disconnect or their account is removed.
- **PauseAI letters and politicians' replies**: kept in full, as public
  figures acting in their public role. A reply may mention a constituent
  or a member of staff; the policy says we keep it anyway.
- **Google** becomes a processor for staff members' mail, as it already is
  for the policy inbox.

## Later, not in these phases

- A custom sentence per person, and PDFs per person.
- Tracking opens. Gmail would need a tracking pixel, which is a spam
  signal, and Apple Mail fakes opens anyway.
- Follow-ups in the same thread, and leaving out anyone we've written to
  or heard from in six months (a search of each sender's mailbox).
- Recording what a reply said, and the two workflows that build on all
  this: mass mail with reminders, and running an event like Go to
  Parliament.
- Journalists and famous people.
- Bulk mail to supporters (`plans/supporters-email.html`).
- A permission for sending mailings, if one turns out to be needed.

## Open questions

1. **Which web form letters to import.** Of 733, 718 were sent; the
   other 13 were spam, invalid or never sent. Import only the 718? Of
   those, 651 have no answer to contact consent: count blank as no?
2. **Is the old web form still live?** Its Frontier AI letters kept
   arriving until 15 October 2026, after Email your MP took over that
   campaign. If it's live, the import isn't one-off, and it must skip
   letters already in `letters` (same sender, politician and ask).
3. **Imported letters' campaign.** Every letter names an ask, so imported
   ones are covered. A supporter's letter also names the site campaign it
   was written through, which imported ones don't have. Make that column
   nullable, or add the old campaigns as campaigns without a page?
4. **Airtable's judgement fields**: Recommended, Important target,
   Personal connection and Notes. They help decide who to mail, but they're
   the policy team's opinions, edited in Airtable. Import them as columns
   on politicians?
5. **Airtable's Test records.** Skip them, and keep our own test MPs
   (`lib/test-mps.json`)?
6. **The Google Cloud project.** Who creates it? A pauseai.uk Workspace
   admin has to own it.
7. **Ask slugs for the old mailings** (`documentary-screening`,
   `westminster-hall-debate` and the rest, in phase 1 step 5). Are these
   asks at all, or just mailings? An invitation to a screening is an ask;
   a briefing on an amendment may not be.
