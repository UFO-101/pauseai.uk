# Politicians and mail from PauseAI

Two features, the first feeding the second:

1. **Politician data.** Everything in Airtable's "UK Politicians" base
   comes into our database: every body, past members, what each has
   signed, PauseAI's emails to them and the public's letters to them.
2. **Mail from PauseAI to politicians.** Staff pick politicians on the
   politicians page, write one mail and schedule it, sent from their own
   Gmail or from Postmark.

Three phases: **1. Data**, **2. Mail politicians**, **3. Leave Airtable**.
Each is one pull request, a commit or more per step, in the order below.

Until phase 3, Airtable is the master copy and the site only reads it. The
site never writes to Airtable. A mail sent from the site isn't in
Airtable's Emails table, and its rollups ("Email count", "Most recent
email") undercount until phase 3.

The principle behind the design, now in `docs/domain-concepts.md` ("A full
history of everyone"): we keep the whole history of our activity with
everyone. Nothing is deleted because it stopped being current. What came
from outside says where from. A supporter's letters and the replies to
them aren't kept as text; PauseAI's letters and the replies to them are.

## What's in Airtable

The "UK Politicians" base (`appBInVvIm6opJ1Ob`), read 26 Oct 2026.

| Table                                  | Rows  | What it is                                                                                     |
| -------------------------------------- | ----- | ---------------------------------------------------------------------------------------------- |
| UK Parliamentarians (`tblH3ks9wqQHLpYx3`) | 1,379 | Everyone in office or once in office, by Body, with Status for those who left              |
| Emails (`tblp4nH5Jymq48rcm`)           | 5,683 | One row per email PauseAI sent one politician: timestamp, a checkbox per mailing               |
| Web form emails (`tblkzjrRHiZiqMDGR`)  | 733   | Letters from the public through the old form, with contact consent and a Campaign              |
| Go to Parliament Oct 2026 (`tblminXS1xSuBbEjz`) | 121 | Luma sign-ups for the lobby day, with the MP matched and "MP Meeting Status"           |

Parliamentarians by Body and Status:

| Body                      | In office | Left                                           |
| ------------------------- | --------- | ---------------------------------------------- |
| House of Commons          | 651       | 5 no longer in office                          |
| House of Lords            | 324       | 10 died, 22 retired, 24 no longer in office    |
| Scottish Parliament       | 129       | 64 no longer in office (the May 2026 election) |
| Northern Ireland Assembly | 90        |                                                |
| Welsh Parliament          | 60        |                                                |

A seat that changes hands gets a new record; the old one keeps its Status
(Makerfield: Andy Burnham, and Josh Simons "No longer in office").

The flags we import, as one status each:

| Airtable field            | Count | Ask                                                        |
| ------------------------- | ----- | ---------------------------------------------------------- |
| Signed Frontier AI Letter | 10    | `frontier-ai-letter`, which `regulate-letter-pm` asks for  |
| Signed DeepMind Letter    | 63    | `deepmind-letter`                                          |
| Signed Liability Letter   | 0     | `liability-letter`                                         |
| ControlAI Signatory       | 167   | `controlai-statement`, from ControlAI directly as now      |

Not imported: Responded and Declined, the per-person PDFs and briefings,
the AI "Custom sentence", Recommended, Important target, Personal
connection and Notes. (Question 5 asks about the last four.)

Emails, by mailing ticked:

| Mailing                                | Emails | When          |
| -------------------------------------- | ------ | ------------- |
| None ticked                            | 4,369  | Jun–Aug 2025  |
| Documentary Invitation                 | 703    | Oct 2025      |
| Westminster Hall Debate Invitation     | 341    | Dec 2025      |
| Edinburgh Conference Nov 26 Invitation | 186    | Oct 2026      |
| Ben Lake October 2026 Debate           | 72     | Oct 2026      |
| CSRB Iqbal Amendment                   | 12     |               |

## The data model

The house pattern, as for supporters: a typed table per kind of thing,
link tables with one nullable foreign key per kind and a
`CHECK num_nonnulls(...) = 1`, and views that make them look alike. No
generic key/value fields: everything is a column with its constraints.

- **`notable_people`**: the parent of everyone we campaign at, whatever
  kind: id, kind (`politician`; later `journalist`, `famous_person`),
  name, salutation, email, status, notes, `airtable_id`. Everything that
  points at a person (asks, letters, history) points here, so a new kind
  changes no other table. `status`, replacing `sitting`: `in_office`,
  `died`, `retired`, `left_office`, `removed_from_airtable`. Nothing is
  ever deleted; a record gone from Airtable is marked
  `removed_from_airtable` and logged. Supporters stay separate: they're
  merged from several sources (`supporter_links`), which notable people
  aren't.
- **`politicians`**: the child for all five bodies, keyed by
  `notable_person_id`, with only what's a politician's: house,
  constituency, party, forename, surname, country, city, test postcode. A
  composite foreign key `(id, kind)` to `notable_people` keeps a
  politician row on a `politician` person. Journalists and famous people,
  later, are children the same way.
- **`asks`**: what we ask notable people to do. A letter to sign, an event
  to come to. Slug, title, kind (`letter`, `event`), date. Added by
  migration.
- **`ask_statuses`** (was `campaign_statuses`): one row per notable person
  per ask, keyed by the ask with a foreign key to `asks`. The statuses a
  kind allows are enforced by a composite foreign key `(kind, status)`.
  A letter's only status is `signed`. Every event shares one enum, keeping
  Airtable's detail: `going`, `tentative`, `meeting_staff`,
  `tentative_staff`, `declined`, `declined_surgery`, `passed_on`
  (Edinburgh's Going, Declined, Passed on request; Go to Parliament's
  Secured as `going`, and the rest by name). Each status has a date and a
  note: the table has both already, but the Signed button writes an empty
  note and there's nowhere to type one. The status control on a
  politician's page (Signed for a letter, a select for an event) gets an
  optional note, shown beside the status; imports write theirs. Who set it
  decides who may change it, as now: staff, `controlai`, `airtable`.
- **Campaigns** stay in `lib/content/email-your-mp.ts`, and say which ask
  they count as done: `done: { ask: "frontier-ai-letter", status:
  "signed" }`. A test checks every slug the code names is in `asks`.
- **`letters`**: the parent of every letter to a notable person: id, kind
  (`supporter`, `pauseai`), notable person, ask, created and sent, status,
  our `Message-ID`, the provider's message and thread IDs.
  `letter_events` (sent, skipped, bounced, replied, auto-reply),
  `email_sends.letter_id` and replies point here, for both kinds.
- **`supporter_letters`**: the child for a supporter's letter: the
  sender's name, email, address, postcode, consent and `reply_hash`.
  `supporter_links` points here. Erasure deletes this row. The 733 web
  form letters are imported here, marked as from Airtable. Their text
  isn't kept, as for every supporter letter.
- **`pauseai_letters`**: the child for PauseAI's: mailing, sender,
  backend, the merge values used. The 5,683 Airtable Emails are imported
  with no text, and personalised and AI-generated as Airtable has them.
- **`mailings`**: a mail to many: ask, template (subject, body),
  attachments, who made it, backend, when it's due. Stored once; a
  recipient's mail is the template plus their merge values, re-rendered
  to show it. The mailing keeps the rendered template it was sent with,
  so a later change to the renderer can't change what it shows.
- **`letter_replies`**: each reply's from, date, subject, `Message-ID`,
  attachment names, and the key of its raw copy in Netlify Blobs, gzipped,
  with attachments. Only for a `pauseai` letter, by a CHECK: a reply to a
  supporter's letter is forwarded and logged as an event, not kept.
  Bodies are read from the blob when opened. The backup Worker pulls new
  blobs as it pulls the database (the site never writes to Cloudflare).

## Phase 1: Data

Steps, a commit or more each:

1. **Parents and renames.** `notable_people` as the parent of
   `politicians`, with every reference to a politician (letters,
   statuses, the audit log's `politicianHistory`) moved to it. `letters`
   becomes the parent, with the sender's details split off into
   `supporter_letters` and `supporter_links.letter_id` pointing there; the
   supporter views and `email_permissions` follow. `campaign_statuses` to
   `ask_statuses`, keyed by ask, with `asks` and its rows for the asks
   above. Mechanical but wide, so first and on its own.
2. **`status` for notable people**, replacing `sitting`. Email your MP and
   every filter that meant "sitting" mean `in_office`.
3. **Sync every body** (`sync-politicians`, replacing `sync-mps`):
   Parliamentarians in, keyed by Airtable record ID, nightly as now, with
   the hold for big changes. A name change on an existing record is held
   for a person to check, since it may be Airtable reusing a record for
   someone new, which would move the old person's history to them.
   Airtable's Test records aren't imported (question 6).
4. **Signed statuses** from the four flags above, owned by `airtable`
   (`updated_by`), as the ControlAI import owns its own: the sync changes
   or removes only those. `lib/server/signatory-import.ts` goes, folded
   into this.
5. **Emails sync** into `pauseai_letters`, nightly with the politicians,
   adding rows by Airtable record ID and never touching rows the site
   sent. The unticked Jun–Aug 2025 emails get `deepmind-letter`
   (question 2).
6. **One-off: Web form emails** into `supporter_letters`, so their
   senders become supporters with the consent they gave (question 3).
7. **One-off: Go to Parliament** onto politicians: a status on the ask
   `go-to-parliament-oct-2026` for each MP a constituent was booked to
   meet, from Airtable. Nothing about the supporter is imported.

### Staff pages

- **Politicians.** Filters for every body, status, party, and signed or
  not signed an ask. Columns for status and asks signed.
- **A politician's page.** Status. Asks and statuses, each marked "from
  Airtable" or with who set it. Supporter letters. PauseAI letters
  (imported: date, ask, personalised). The Go to Parliament booking:
  "Booked to meet a constituent at Go to Parliament, Oct 2026 (from
  Airtable)".
- **Letters to MPs.** Named for supporter letters; imported web form
  letters marked as such.
- **Supporters.** Web form senders appear, with Airtable's web form as
  their source.
- **Asks** (`/staff/asks`, new). Each ask, its kind and date, and how many
  politicians have each status. Read-only.
- **Import.** `sync-politicians`, the Emails sync, the two one-offs, each
  with run, hold and apply as the other jobs have.
- **Changes** (the audit log). New actions in the table in
  `docs/domain-concepts.md`.

## Phase 2: Mail politicians

Steps, a commit or more each:

1. **Gmail samples first.** Connect a test account by hand and send to a
   domain that doesn't exist, a mailbox that doesn't exist and an
   auto-replying address; save what comes back (anonymised) as test
   fixtures. The bounce and reply parsers are written against these.
2. **Backends.** `send()` in `lib/server/email.ts` takes a backend: a
   `MailBackend` type (send one email, how many more today) with a
   function per backend, `postmark(stream)` and `gmail(staffAccount)`,
   returning plain objects. No classes. The fixture outbox becomes a third
   backend. `email_sends` records the backend and the sender address.
3. **Connect Gmail.** A Google Cloud project owned by the pauseai.uk
   Workspace, its OAuth consent screen "Internal", so only pauseai.uk
   accounts can grant it and Google's verification isn't needed
   ([user type](https://support.google.com/cloud/answer/15549945)). Scopes
   `gmail.send` and `gmail.readonly`
   ([scopes](https://developers.google.com/workspace/gmail/api/auth/scopes)).
   The refresh token is stored encrypted on the staff account. Any staff
   account can connect; no permission needed.
4. **Mailings.** Filters, "Mail these", the editor, preview, test send,
   schedule. Recipients are fixed when it's scheduled: one
   `pauseai_letters` row each. At send time a blocked address or a
   politician no longer in office is skipped, and logged as skipped.
5. **The `send-mail` job.** Scheduled every few minutes, but it reads only
   a Netlify Blob holding the next due time, so the database wakes only
   while there's mail to send. A run sends what it can in its 30 seconds
   ([limit](https://docs.netlify.com/build/functions/scheduled-functions/))
   and leaves the rest. A Gmail sender stops at their share of Workspace's
   2,000 a day ([limits](https://support.google.com/a/answer/166852)); the
   API allows about 60 sends a minute each
   ([quota](https://developers.google.com/workspace/gmail/api/reference/quota)).
6. **Bounces and replies from Gmail.** Hourly with the other jobs, for each
   connected account, `users.history.list` from the last `historyId`
   ([docs](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list))
   gives the messages added since. One in a thread of ours is a bounce
   (from mailer-daemon or postmaster: a `DeliveryProblem` to
   `recordProblem()`, so `email_problems` and `email_blocks` as every
   bounce), an auto-reply (`Auto-Submitted` and the like) or a reply. A
   reply is fetched raw (`messages.get`, `format=raw`), gzipped into
   Blobs, and its headers go in `letter_replies`. Bounces from
   remote servers that don't join the thread are found by a search
   (`from:mailer-daemon OR from:postmaster newer_than:3d`). Gmail never
   reports spam complaints, which is why big mailings should go by
   Postmark.
7. **Postmark mailings' replies** come in as supporter letters' do: a
   `reply_hash` address on `letters.pauseai.uk`, through the inbound
   webhook, stored as above and forwarded to the staff member who sent
   it.
8. **Backups.** The backup Worker (`backup/`) pulls new reply blobs by key
   since its last run, through a read-only route on the site.

The mail editor is the one Email your MP uses (`lib/letter-format.ts`),
with fields (`{salutation}`, `{name}`, `{constituency}`) and blocks shown
only to some (`[if signed frontier-ai-letter] … [end]`). Attachments are
the mailing's, the same for everyone.

### Staff pages

- **Your staff account.** Connect Gmail, Disconnect, which address, and
  today's sends against the cap.
- **Politicians.** Filters for "not already mailed for this ask", and a
  "Mail these" button that opens a new mailing with the filtered list.
- **Mailings** (`/staff/mailings`, new). The list: ask, sender, backend,
  when, and how many sent, skipped, bounced and replied. New and edit:
  recipients with untick boxes, subject and body, attachments, from, when.
  Preview for any recipient; test send to yourself. Schedule, cancel. A
  mailing's page: every recipient and what happened.
- **A politician's page.** Their PauseAI letters, each opening the mail
  as sent; replies, opening the stored message and its attachments;
  bounces, by either backend.
- **Blocked MP emails.** Bounces found in Gmail, marked as from Gmail.
- **Import.** Runs of `send-mail` and the hourly Gmail check.

## Phase 3: Leave Airtable

- Staff add politicians (not possible today), edit every field the sync
  owned, and change status when someone leaves office.
- Any ask's status can be set by hand, not only `trackedCampaigns`'.
- Asks are added from `/staff/asks`, if adding them by migration has got
  in the way by then.
- The syncs stop and come off the Import page. Each politician keeps
  their `airtable_id`.
- Possibly Parliament's member IDs on politicians, which would let a
  re-elected member's two records be merged.

## Tests and the storyboard

Every step at 100% coverage as usual. Each new page gets gallery examples
for new components, storyboard flows with a frame after each thing a
person sees, and its line in `docs/testing.md`. In particular:

- Phase 1: the politicians filters; a politician's page with statuses
  from Airtable, a left-office politician, imported PauseAI letters; a
  held sync with a renamed record; each one-off import's run.
- Phase 2: connecting Gmail (against a fake Google); "Mail these" to a
  mailing, preview, test send, schedule; a mailing's page after sending;
  a test politician whose Gmail send bounces, shown on their page and in
  Blocked MP emails; a reply shown on a politician's page.
- Bouncing is tested on the real samples from phase 2's step 1: each
  sample gives the right `DeliveryProblem` (or none, for a delay), and
  the whole path, from the history feed to the blocked address to the
  next send refused, runs against a fake Gmail.

## Data protection

What this does to `docs/data-protection.md`, the privacy policy and
erasure, to agree before building:

- **Web form emails' senders** (733): a new source of supporter letters,
  with name, email, postcode and contact consent. Not their message. Erased
  like any supporter letter.
- **Gmail tokens**: staff members' OAuth refresh tokens, encrypted. Removed
  when they disconnect or their account is removed.
- **PauseAI letters and politicians' replies**: kept in full, as public
  figures acting in their public role. A reply can mention a constituent
  or a member of staff; that's accepted, and the policy says so.
- **Google** becomes a processor for staff mail, as it is already for the
  policy inbox.

## Later, not in these phases

- The per-person custom sentence and per-person PDFs.
- Tracking opens (a pixel for Gmail; a spam signal, and Apple's mail
  privacy fakes them).
- Follow-ups in the same thread; skipping anyone we've corresponded with
  in six months (a search of each sender's mailbox).
- Recording what a reply said (positive, negative), and the two workflows
  that build on this: mass email with reminders, and running an event like
  Go to Parliament.
- Journalists and famous people.
- Bulk mail to supporters: `plans/supporters-email.html`, which uses this
  mail layer.
- A permission for mailing, if it's needed.

## Open questions

1. **Go to Parliament's date.** The ask needs one. Which day was it?
2. **The 4,369 unticked emails** of Jun–Aug 2025: the DeepMind letter? A
   question for Joseph.
3. **Which web form emails to import.** Only those sent ("Email Sent Time"
   set, not Spam, not "Invalid, can't send")? And contact consent "Yes"
   becomes `contact_consent`, blank becomes no?
4. **Web form letters' campaigns.** Every letter now names an ask, so the
   imported DeepMind, Liability and Frontier AI letters have one. A
   supporter's letter also names the site campaign it was written through;
   the imported ones have none. Make that campaign nullable for imported
   letters, or add the old campaigns as campaigns with no page?
5. **Airtable's judgement fields**: Recommended, Important target,
   Personal connection, Notes. Import them as columns on politicians? They
   decide who gets mailed, but they're the policy team's opinions, edited
   in Airtable.
6. **Airtable's Test records**: skip them and keep our own test MPs
   (`lib/test-mps.json`)?
7. **The Google Cloud project**: who creates it? It needs a pauseai.uk
   Workspace admin to own it.
