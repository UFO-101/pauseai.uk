# Mailings

Staff choose people from the politicians or supporters list, write a
mailing to them and schedule it. This plan builds the parts every
mailing needs. Sending by each channel is in its own plan:

- `plans/politician-email.md`: email to politicians, sent by Gmail.
- `plans/supporters-email.md`: email to supporters.
- `plans/supporters-phone.md`: texts and WhatsApp to supporters.

It is three pull requests, none depending on anything outside the site:

1. Data: the tables, stored filters, templates, channels and the send
   job, with nothing new for staff to see but the editor in the gallery.
2. Mailings: the staff pages for mailings to politicians.
3. Messages: the staff pages for messages to supporters.

After phase 2, staff can make a mailing to politicians on the live
site, see who it would go to, and send a test copy to themselves. They
can schedule one once Gmail is built (`plans/politician-email.md`).

## What we have now

- The `mailings` table holds the mailings imported from Airtable, with
  their title and ask, and the tick box (`airtable_field`) or dates
  (`airtable_sent_between`) that identify them in Airtable.
- `letters` holds every letter to a notable person. It has two child
  tables: `supporter_letters`, a supporter's letter in a campaign, and
  `pauseai_letters`, PauseAI's letter in a mailing.
- `/staff/mailings` lists the imported mailings, and each has a page
  (`lib/server/mailings.ts`).
- `send()` in `lib/server/email.ts` sends by Postmark, refuses blocked
  addresses and logs each send to `email_sends`.
- `contact_permission(topic, channel, address)` says whether we may
  contact an email address or phone number about a topic: yes, unsure
  or no.
- `SupporterFilter` and `PoliticianFilter` hold each list's filters.
  They are read from the page's URL, together with the sort order and
  page number.

## Data model

A letter is an email to a notable person. A message is an email, text
or WhatsApp message to a supporter. Each table's name says which way it
goes, so "supporter" never means "from" in one table and "to" in the
next. The first step renames the tables we have:

| Now                 | Renamed                   | One row is                                                |
| ------------------- | ------------------------- | --------------------------------------------------------- |
| `letters`           | `letters`                 | A letter to a notable person, from anyone                 |
| `supporter_letters` | `letters_from_supporters` | A supporter's letter to a politician, in a campaign       |
| `pauseai_letters`   | `letters_from_pauseai`    | PauseAI's letter to a politician, in a mailing            |
| (new)               | `messages_to_supporters`  | PauseAI's message to a supporter, in a mailing            |
| `letter_events`     | `letter_events`           | Something that happened to a letter: sent, bounced…       |
| (new)               | `message_events`          | Something that happened to a message: delivered, failed…  |
| (later)             | `letter_replies`          | A later email in a letter's thread (`politician-email.md`) |
| (later)             | `message_replies`         | A supporter's reply, or our answer (`supporters-phone.md`) |

`letters.kind` keeps its values, `supporter` and `pauseai`, which now
read as who it is from. A text to a politician, if we ever send one,
would not be a letter; it would need its own table.

Mail to politicians:

```
                     notable_people ── politicians
                           ▲
                           │ to
                        letters ◄── letter_events
                           │
              ┌────────────┴─────────────┐
              │ one of                   │ one of
  letters_from_supporters        letters_from_pauseai
     │            │                      │
     │ in         │ written in           │ in
     ▼            ▼                      ▼
 campaigns    form_entries            mailings
     │            ▲                      │
     │ asks       │ linked by            │ asks
     ▼            │                      ▼
   asks     supporter_links ──► supporters
```

Mail to supporters:

```
 mailings ◄── messages_to_supporters ──► supporters
                        ▲
                        └── message_events
```

A mailing's recipients are in one of two tables, by audience:

```
               mailings
        ┌─────────┴──────────┐
letters_from_pauseai   messages_to_supporters
  (politicians)            (supporters)
```

- `mailings` gets new columns: the audience (`politicians` or
  `supporters`), the channel (`email`, `text` or `whatsapp`), the
  stored filter, the template and its merge fields, who made it, who it
  is sent from, when it is due, and its state (`draft`, `scheduled`,
  `sending`, `sent` or `cancelled`). Only the imported mailings may
  have no template.
- `messages_to_supporters` has one row per supporter in a mailing: the
  supporter, the address or number used, the status (`scheduled`,
  `sent`, `delivered`, `failed` or `skipped`), the provider's message
  ID, the merge values, and the reason if it was skipped. Erasure
  deletes the address and merge values but keeps the row.

We don't store each message's text. It can be rebuilt from the template
and the recipient's merge values. The mailing keeps a copy of the
template as it was when sent, so later changes to the template code
don't change it.

## Rules

- The recipients are fixed when the mailing is scheduled, with one row
  each. Who received a mailing never depends on running its filter
  again.
- Each message is checked again just before it is sent. For a
  supporter, `contact_permission()` must still say yes for the
  mailing's topic. For a politician, their address must not be blocked
  and they must still be in office. Anyone who fails the check is
  skipped, and the reason is recorded.
- Someone with no address for the channel is never in a mailing: they
  are left out when it starts, and its To line says how many, rather
  than being skipped at sending.
- Anyone who can see a list can send a mailing to it. Every staff
  account can mail politicians. Only accounts with the `supporters`
  permission can mail supporters.
- Supporters can only be messaged from a list filtered to those we can
  contact: a Contact filter answered "Can email" or "Can text" for one
  topic. That filter decides the mailing's channel and topic, so the
  Mail button on the supporters list offers email for a "Can email"
  filter and text for a "Can text" one. Without such a filter the
  button can't be pressed, and says which filter to add. "Not sure"
  isn't enough, so members can't be emailed about PauseAI updates until
  we can read CiviCRM's unsubscribes (`plans/supporters-email.md`).
- A stored filter is read strictly. If it contains a value the site no
  longer recognises, such as a renamed topic or a deleted event, the
  mailing can't be scheduled until someone fixes it. Otherwise the
  filter would silently match more people.

## Phase 1: Data

1. Rename the tables, in a migration and a commit of their own, before
   anything else. `supporter_letters` is used in 22 files and
   `pauseai_letters` in 12, including erasure, supporter links, the
   supporter views, `contact_permission()`, the backup Worker's checks
   and the docs.
2. Add the new columns to `mailings`, and the `messages_to_supporters`
   and `message_events` tables. A draft is a `mailings` row in the
   `draft` state, saved with a version number so a second person
   editing it is told rather than overwritten.
3. Store filters. Separate who a list shows from how it is shown, for
   both lists, as one validated value that a mailing stores as JSON,
   and that can be shown in words or run again.
4. Templates. Extend Email your MP's document (`lib/letter-format.ts`)
   and its Tiptap editor with two nodes: a merge field, an inline chip
   that is deleted, copied and moved whole, which typing `{` offers; and
   a block shown only to some recipients, such as those who signed an
   ask. Staff never see or type markup. The editor is built and in the
   component gallery (`MailingEditor`). The server checks the document
   as it checks letters, and one function writes a recipient's HTML and
   plain text from it, for the dry run, test sends and sending. Every
   merge field must have a value for every recipient: Write names those
   missing one, with links to fix them, and Schedule can't be reached
   until they're fixed or the field is taken out. So the only reasons
   to skip someone at sending are ones that change after scheduling: a
   blocked address, or leaving office.
5. Channels. `Channel` is a type with four functions: send one message,
   say how many more can be sent today, say what one message costs, and
   turn a provider's report into an event. Each channel also has a fake
   version for fixture builds, the dev server and tests. The fake writes
   each message to the outbox (`tests/fixtures/outbox.ts`), and a test
   can report deliveries, failures, bounces, opt-outs and replies
   through the same code as the real webhook. This plan uses the fake
   email channel that already exists.
6. The `send-mailings` job runs hourly, during the database wake that
   the other jobs share. Each run sends what it can in 30 seconds and
   leaves the rest for the next run. That is too slow for Gmail's pace
   of about 60 a minute (see the open question).

## Phase 2: Mailings

Mailings to politicians, under Politicians in the menu, as now. Mail to
politicians is from a person, a letter at a time, with replies and
answers to an ask, so it has its own pages, sharing the data, editor,
drafts and sending with Messages. Designed first as mock-ups on the
real staff components, on a design canvas:
https://claude.ai/artifact/3qi42XAhd2qwYBTRYVGZoz

- A "Mail these" button on the politicians list, beside Download over
  the table, with the count in it ("Mail these 129…") (chosen on the
  canvas).
- A new mailing in two steps, with a bar of the steps at the top and
  Back and Next in a bar fixed to the bottom of the window. Done steps
  link back; a step that can't be reached yet is greyed and says what
  it needs. There's no step for who: staff have just chosen them on the
  list, so the mailing opens on Write.
  1. Write: at the top, who it's to: the count, the filter as
     read-only pills, and "Change who", which goes back to the list
     with the filter filled in, where the button updates this draft's
     recipients instead of starting a new mailing. Then the editor,
     with the details at the side. No preview here: the Schedule step
     shows each recipient's email.
  2. Schedule: a checklist. A dry run, run as the page opens, of who
     the mailing would go to and who would be skipped and why, with
     nothing recorded as sent. "Leave out" takes one person out, with a
     reason saved with the mailing. Each recipient's email, stepped
     through one at a time, and a test send of the one shown: one real
     message to your own pauseai.uk address by Postmark, logged as
     `mailing-test`, skipping permissions, or by Gmail once it's built.
     Last, when it goes, with the schedule button in the bottom bar.
- Drafts. A mailing becomes a draft at the first change worth keeping:
  writing in the subject or letter, attaching a file, or leaving
  someone out. Until then nothing is saved. A draft saves itself a
  moment after each change. A draft with no subject or letter is
  deleted after a day unopened. "Delete draft" deletes it after one
  confirmation; a draft has sent nothing, so it isn't archived.
- A mailing's page (chosen on the canvas): its title and state, when
  and from whom it went, and its ask; a coloured count each of sent,
  replied, bounced, skipped and answered the ask; then the recipients
  in a table, with tabs for all, replied, bounced and skipped, beside
  the email and who it was for, as read-only pills. Scheduled, a band
  says when it sends, with "Change the time" and Stop, which turns it
  back into a draft. Sending, a progress bar and each recipient ticked
  as it goes, with Stop, which sends no more. A sent mailing can't be
  deleted.
- The list of mailings, in three parts (chosen on the canvas): drafts,
  each with Delete draft; coming up, each with Stop; and a table of
  those sent, with how many were sent, bounced, replied and answered
  the ask.

## Phase 3: Messages

Messages to supporters, under Supporters in the menu, seen only with
the `supporters` permission. They are from PauseAI UK, by email or
text, with consent, opt-outs and a cost, so they have their own pages,
built on phase 2's. To be designed once phase 2's are settled.

- "Email these" or "Text these" on the supporters list, following its
  Contact filter. Without a "Can email" or "Can text" filter the button
  is dotted, and clicking it explains which filter to add.
- The same two steps, with the channel and topic fixed by the filter,
  a count of texts and their cost, and opt-outs among the reasons to be
  skipped.
- A message's page and the list of messages, with delivered, failed,
  opted out, replies and cost.

## Open questions

1. The send job's 30 seconds an hour sends about 30 emails by Gmail, so
   126 would take five hours. Should a due mailing start a Netlify
   background function, which runs for up to 15 minutes, and send at
   the channel's own pace?
