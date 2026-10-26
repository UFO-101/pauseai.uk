# Politicians and mail from PauseAI

Two features, the second built on the first:

1. **Politician data.** Everything in Airtable's "UK Politicians" base
   comes into our database: all five bodies, everyone who has left, what
   each has signed or agreed to, every email PauseAI has sent them, and
   the letters the public sent them through the old web form.
2. **Mail from PauseAI to politicians.** Staff filter the politicians
   page, press "Mail these", write one mail and schedule it. It goes from
   their own Gmail, or from Postmark for big sends.

Three phases, one pull request each:

| Phase               | What staff get                                                                  |
| ------------------- | ------------------------------------------------------------------------------- |
| 1. Data             | Every politician, past and present, with their asks and every letter to them    |
| 2. Mail politicians | Mailings from the politicians page, by Gmail or Postmark, with bounces, replies |
| 3. Leave Airtable   | Politicians edited in the site; the Airtable sync stops                         |

## Rules

- **Airtable is read, never written.** It's the master copy until phase 3.
  Mail sent from the site isn't in Airtable's Emails table, so Airtable's
  "Email count" and "Most recent email" undercount until then.
- **We keep a full history of everyone** (`docs/domain-concepts.md`).
  Nothing is deleted for no longer being current: a politician who leaves
  office is marked, not removed. Imported data says where it came from.
- **We keep the text of PauseAI's letters and their replies**, but not of
  supporters' letters or their replies.
- **The database enforces everything**: typed columns and constraints, no
  key/value fields.

## Data model

```
notable_people ──┬── politicians              (later: journalists, famous people)
                 ├── ask_statuses ── asks
                 └── letters ──┬── supporter_letters
                               ├── pauseai_letters ── mailings
                               ├── letter_events
                               └── letter_replies (PauseAI letters only)
```

`notable_people` and `letters` are parent tables: each holds what all its
kinds share, and everything else points at the parent. A new kind, such
as journalists, adds a child table and changes nothing else.

### People

- **`notable_people`**: everyone we campaign at. Kind (`politician` for
  now), name, salutation, email, status, notes, `airtable_id`. Status
  replaces `sitting`: `in_office`, `died`, `retired`, `left_office`, or
  `removed_from_airtable`.
- **`politicians`**: what only a politician has. House, constituency,
  party, forename, surname, country, city, test postcode. A composite
  foreign key `(id, kind)` ties each row to a `politician`.

Supporters stay separate. They're merged from several sources
(`supporter_links`); notable people aren't.

### Asks

An ask is something we ask people to do whose answer we record: sign a
letter, come to an event.

- **`asks`**: slug, title, kind (`letter` or `event`), date. One
  migration adds each.
- **`ask_statuses`** (was `campaign_statuses`): one person's answer to one
  ask, with a date, a note, and who set it. A composite foreign key
  `(kind, status)` limits the statuses to those the ask's kind allows:

  | Kind   | Statuses                                                                                              |
  | ------ | ----------------------------------------------------------------------------------------------------- |
  | Letter | `signed`                                                                                              |
  | Event  | `going`, `tentative`, `meeting_staff`, `tentative_staff`, `declined`, `declined_surgery`, `passed_on` |

  Whoever set a status owns it: staff, or an import (`controlai`,
  `airtable`) that changes only its own.

- **Campaigns** stay in `lib/content/email-your-mp.ts`, each naming one
  ask: `regulate-letter-pm` asks for `frontier-ai-letter`,
  `support-sobel-bill` for `controlai-statement`. A campaign that can be
  done says which status counts: `done: { ask: "frontier-ai-letter",
  status: "signed" }`. A test checks every ask named in code exists.

### Letters

- **`letters`**: every letter to a notable person. Kind (`supporter` or
  `pauseai`), the person, the ask, created and sent times, status, our
  `Message-ID`, and the provider's message and thread IDs. The ask is
  required on a supporter's letter and optional on PauseAI's, since an
  invitation or a briefing may ask nothing we record. `letter_events`
  (sent, skipped, bounced, replied, auto-reply) and
  `email_sends.letter_id` point here.
- **`supporter_letters`**: the sender's name, email, address, postcode,
  consent and `reply_hash`. `supporter_links` points here, and erasure
  deletes the row.
- **`pauseai_letters`**: the mailing, the staff member who sent it, the
  backend, and the values merged into the template for this person.
- **`mailings`**: one mail to many people. Title, ask if any, subject and
  body template, attachments, who made it, backend, and when it's due.
  A person's mail isn't stored: it's re-rendered from the template and
  their merge values. The mailing keeps the rendered template it was sent
  with, so a later change to the renderer can't change it. Mailings
  imported from Airtable have no template, which a CHECK allows only for
  them.
- **`letter_replies`**: a politician's reply to a PauseAI letter. From,
  date, subject, `Message-ID`, attachment names, and the key of the raw
  message in Netlify Blobs, gzipped with its attachments. A reply to a
  supporter's letter is forwarded and logged as an event, as now, but not
  stored.

Letters record the ask, not the campaign. The Letters to MPs filter, the
one-letter-per-sender rule (now per ask) and a supporter's activity all
use the ask. If two campaigns ever share an ask, a nullable `campaign`
column can come back.

## Phase 1: Data

1. **Parent tables and renames.** Add `notable_people` and point every
   reference to a politician at it (letters, statuses,
   `politicianHistory`). Split the sender's details off `letters` into
   `supporter_letters`, and point `supporter_links`, the supporter views
   and `email_permissions` there. Rename `campaign_statuses` to
   `ask_statuses`, keyed by ask, and add `asks`. This touches a lot of
   code, so it's its own commit.
2. **Status instead of `sitting`.** Email your MP and every filter that
   meant "sitting" now mean `in_office`.
3. **Sync every body.** `sync-politicians` replaces `sync-mps`: all of UK
   Parliamentarians, nightly, keyed by Airtable record ID, still holding a
   large change for a person to check. A name change on an existing record
   is held too, as it may be Airtable reusing a record for someone new,
   which would give them the old person's history. Records ticked Test
   are skipped; the site keeps its own test MPs (`lib/test-mps.json`).
   Airtable's Notes go into `notable_people.notes`.
4. **Statuses**, owned by `airtable`. This replaces
   `lib/server/signatory-import.ts`.

   | Airtable field                     | Politicians                      | Ask                                         |
   | ---------------------------------- | -------------------------------- | ------------------------------------------- |
   | Signed Frontier AI Letter          | 10                               | `frontier-ai-letter`                        |
   | Signed DeepMind Letter             | 63                               | `deepmind-letter`                           |
   | Signed Liability Letter            | 0                                | `liability-letter`                          |
   | ControlAI Signatory                | 167                              | `controlai-statement`, from ControlAI as now |
   | Edinburgh Conference November 2026 | 50 Declined, 1 Passed on request | `edinburgh-conference-2026`                 |
   | Parliament meeting 23 June 2026    | 1                                | `parliament-meeting-2026-06-23`, `going`    |
   | London 2026 Panel                  | 4                                | `london-2026-panel`, `going`                |

   Not imported: Responded and Declined on the letters; "Responded PauseAI
   Documentary Screening invitation" (2), which has no ask; "Sent DeepMind
   letter publication email", which the Emails sync covers; the
   per-person PDFs; the AI "Custom sentence"; and the three ticks waiting
   on Joseph (below).

5. **Emails sync** into `pauseai_letters`, nightly. It adds rows by
   Airtable record ID and never touches mail the site sent. Airtable has
   no text, so a row records who, when, and Personalized and AI
   Generated. Each Airtable mailing becomes an imported `mailings` row:

   | Airtable's mailing                     | Emails | When         | Ask                         |
   | -------------------------------------- | ------ | ------------ | --------------------------- |
   | None ticked                            | 4,369  | Jun–Aug 2025 | `deepmind-letter`           |
   | Documentary Invitation                 | 703    | Oct 2025     |                             |
   | Westminster Hall Debate Invitation     | 341    | Dec 2025     |                             |
   | Edinburgh Conference Nov 26 Invitation | 186    | Oct 2026     | `edinburgh-conference-2026` |
   | Ben Lake October 2026 Debate           | 72     | Oct 2026     |                             |
   | CSRB Iqbal Amendment                   | 12     |              |                             |

   The unticked emails are the DeepMind letter and its follow-ups: 1,304
   of the 1,307 politicians with a DeepMind Letter PDF got them, most three
   or four each, and nobody else did.

6. **Import web form letters, once**, into `supporter_letters`, so their
   senders become supporters. They came from pauseai.info's old UK tool
   (`/uk-email-mp`, 18 July 2025 to 19 October 2026), which wrote each
   letter to Airtable for an automation to send. It now redirects to
   pauseai.uk. We import the 718 that were sent and skip 13 marked spam,
   invalid or unsent. The consent checkbox arrived on 23 September 2026,
   so the 651 earlier letters count as no consent. A letter already in
   `letters` (same sender, politician and ask) is skipped.
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

- **Politicians**: filters for body, status, party, and signed or not
  signed an ask; columns for status and asks signed.
- **A politician's page**: status; each ask's status with its note and who
  set it, or "from Airtable"; supporter letters; PauseAI letters, with
  date, ask and whether personalised. The status control (Signed for a
  letter, a select for an event) gets a note field. The column exists
  already, but nothing fills it.
- **Letters to MPs**: supporter letters only, with imported ones marked.
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
checks blocks and logs to `email_sends`. `send()` gets a backend, chosen
per mailing:

- **Gmail, as the staff member.** Reads as personal mail, lands in their
  Sent folder, and replies come back to them. About 2,000 a day per person
  ([limits](https://support.google.com/a/answer/166852)). Gmail never
  reports spam complaints.
- **Postmark**, transactional or broadcast stream. Made for volume, with
  bounce and complaint webhooks, but reads as bulk mail.

The new-mailing page suggests Gmail for tens of people and Postmark for
hundreds; staff can change it.

In code, `MailBackend` is a type (send one email; how many more today),
and `postmark(stream)` and `gmail(staffAccount)` return plain objects of
that type. The fixture outbox becomes a third backend. `email_sends`
records the backend and sender address. Bulk mail to supporters
(`plans/supporters-email.html`) uses the same backends.

### Steps

1. **Collect real Gmail samples.** From a test account, send to a domain
   that doesn't exist, a mailbox that doesn't exist, and an auto-replying
   address. Save what comes back, anonymised, as fixtures for the bounce
   and reply parsers.
2. **Backends**, as above.
3. **Connect Gmail.** Joseph, as Workspace admin, creates a Google Cloud
   project with an "Internal" OAuth consent screen. Only pauseai.uk
   accounts can grant it, and Google doesn't need to verify it
   ([user type](https://support.google.com/cloud/answer/15549945)).
   Scopes: `gmail.send` and `gmail.readonly`
   ([scopes](https://developers.google.com/workspace/gmail/api/auth/scopes)).
   The refresh token is stored encrypted on the staff account. Any staff
   account can connect.
4. **Mailings.** "Mail these", the editor, preview, test send, schedule.
   Scheduling fixes the recipients, one `pauseai_letters` row each. At
   send time, anyone whose address is blocked or who has left office is
   skipped and logged.
5. **The `send-mail` job**, every few minutes. It reads the next due time
   from a Netlify Blob, so it wakes the database only when mail is due.
   Each run sends what fits in 30 seconds
   ([limit](https://docs.netlify.com/build/functions/scheduled-functions/))
   and leaves the rest to the next run. Gmail allows about 60 sends a
   minute per person
   ([quota](https://developers.google.com/workspace/gmail/api/reference/quota)).
6. **Gmail bounces and replies**, hourly. For each connected account,
   `users.history.list` since the last `historyId`
   ([docs](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list))
   gives the new messages. A new message in one of our threads is:
   - a **bounce** if it's from mailer-daemon or postmaster. It becomes a
     `DeliveryProblem` for `recordProblem()`, so it's blocked and logged
     like a Postmark bounce;
   - an **auto-reply** if it has `Auto-Submitted` or similar. It's logged
     as an event;
   - otherwise a **reply**. It's fetched raw (`messages.get`,
     `format=raw`), gzipped into Netlify Blobs, and recorded in
     `letter_replies`.

   Bounces from remote servers may not join the thread. A search for
   `from:mailer-daemon OR from:postmaster newer_than:3d` finds them.

7. **Replies to Postmark mailings** arrive like replies to supporter
   letters: at a `reply_hash` address on `letters.pauseai.uk`, through the
   inbound webhook. They're stored as above and forwarded to the sender.
8. **Backups.** The backup Worker (`backup/`) pulls new reply blobs
   through a read-only route on the site. The site never writes to
   Cloudflare.

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

- **Your staff account**: Connect Gmail and Disconnect, the connected
  address, and today's sends against the cap.
- **Politicians**: a "not mailed for this ask" filter, and "Mail these",
  which opens a new mailing with the filtered list.
- **Mailings** (`/staff/mailings`, new):
  - the list: ask, sender, backend, when, and counts sent, skipped,
    bounced and replied;
  - new and edit: recipients with untick boxes, subject, body,
    attachments, sender, time;
  - preview as any recipient, and a test send to yourself;
  - schedule and cancel;
  - a mailing's page, with every recipient's outcome.
- **A politician's page**: their PauseAI letters, each opening as sent;
  replies, with attachments; bounces from either backend.
- **Blocked MP emails**: bounces found in Gmail, marked as such.
- **Import**: runs of `send-mail` and the Gmail check.

### Tests

Connecting Gmail, against a fake Google. "Mail these" through to
scheduling, and a mailing's page after sending. A test politician whose
Gmail send bounces, shown on their page and in Blocked MP emails. A reply
on a politician's page. The parsers against the samples from step 1: each
gives the right `DeliveryProblem`, or none for a delay. The whole path
from the history feed to a blocked address to the next send refused,
against a fake Gmail.

## Phase 3: Leave Airtable

- Staff add politicians, edit everything the sync owned, and change a
  status with the date and a note (a resignation, the by-election after).
  Airtable keeps these in Notes: 71 of its 106 notes record a status or
  party change with its real date and reason, which our audit log can't,
  as it only knows when the sync saw the change.
- Staff set any ask's status by hand, not just those of
  `trackedCampaigns`.
- Asks can be added on `/staff/asks`, if a migration each has become a
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
- **Gmail tokens**: encrypted, deleted when a staff member disconnects or
  their account is removed.
- **PauseAI letters and politicians' replies**: kept in full, as public
  figures in their public role. A reply may mention a constituent or a
  member of staff; we keep it anyway, and the policy says so.
- **Google**: a processor for staff members' mail, as it already is for
  the policy inbox.

## Not in these phases

- A custom sentence per person, and PDFs per person.
- Open tracking. Gmail would need a tracking pixel, which looks like spam,
  and Apple Mail fakes opens anyway.
- Follow-ups in the same thread, and leaving out anyone we've been in
  touch with in the last six months.
- Recording what a reply said, and the workflows built on this: mass mail
  with reminders, and running an event like Go to Parliament.
- Journalists and famous people.
- Bulk mail to supporters (`plans/supporters-email.html`).
- A permission for sending mailings, if one is needed.

## Waiting on Joseph

- **The Google Cloud project** (phase 2, step 3).
- **Airtable's three ticks**: Important target (98), Recommended (15),
  Personal connection (7). So far Joseph says:
  - Recommended is just a note, so it becomes a line in the person's
    notes ("Recommended", from Airtable).
  - Important target and Personal connection are things he sometimes
    filters on, so they must be filterable.

  Still to find out: whether more markers like these will come, which
  decides between two columns on `notable_people` and tags. If tags: each
  tagging records who, when and a note, removals are logged, each tag has
  a description, and tags only filter, never trigger anything. Facts
  (asks, body, party, status) are never tags.
