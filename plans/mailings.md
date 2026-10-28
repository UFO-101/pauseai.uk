# Mailings

Staff choose people from the politicians or supporters list, write a
mailing to them and schedule it. This plan builds the parts every
mailing needs. Sending by each channel is in its own plan:

- `plans/politician-email.md`: email to politicians, sent by Gmail.
- `plans/supporters-email.md`: email to supporters.
- `plans/supporters-phone.md`: texts and WhatsApp to supporters.

This plan is one pull request and doesn't depend on anything outside the
site. After it, staff can make a mailing on the live site, see who it
would go to, and send a test copy to themselves. They can schedule a
mailing for a channel once that channel's plan is built.

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

## Steps

1. Rename the tables, in a migration and a commit of their own, before
   anything else. `supporter_letters` is used in 22 files and
   `pauseai_letters` in 12, including erasure, supporter links, the
   supporter views, `contact_permission()`, the backup Worker's checks
   and the docs.
2. Store filters. Separate who a list shows from how it is shown, for
   both lists, as one validated value that a mailing stores as JSON. A
   mailing's page shows its filter in words and can run it again to
   show who it would choose now.
3. Templates. Use Email your MP's format (`lib/letter-format.ts`) and
   add merge fields and sections shown only to some recipients, such as
   `[if signed frontier-ai-letter] … [end]`. If a merge field can't be
   filled in for someone, they are skipped.
4. Channels. `Channel` is a type with four functions: send one message,
   say how many more can be sent today, say what one message costs, and
   turn a provider's report into an event. Each channel also has a fake
   version for fixture builds, the dev server and tests. The fake writes
   each message to the outbox (`tests/fixtures/outbox.ts`), and a test
   can report deliveries, failures, bounces, opt-outs and replies
   through the same code as the real webhook. This plan uses the fake
   email channel that already exists.
5. The `send-mailings` job runs hourly, during the database wake that
   the other jobs share. Each run sends what it can in 30 seconds and
   leaves the rest for the next run.
6. Staff pages. Design them first, as mock-ups on the real staff
   components on desktop and phone, and choose between them. The
   mock-ups are on a design canvas:
   https://claude.ai/artifact/3qi42XAhd2qwYBTRYVGZoz
   - A "Mail these" button on the politicians list, and on the
     supporters list "Email these" or "Text these", following the
     Contact filter.
   - A new mailing in four steps, with a bar of the steps at the top
     and Back and Next in a bar fixed to the bottom of the window.
     Done steps link back; a step that can't be reached yet is greyed
     and says what it needs.
     1. Who: the count, the filter as read-only pills, and a few of
        the recipients. "Change who" goes back to the list with the
        filter filled in, where the button updates this draft's
        recipients instead of starting a new mailing.
     2. Write: the template, merge fields and attachments, with a
        preview as any recipient.
     3. Check: a dry run, which shows who the mailing would go to and
        who would be skipped and why, with nothing recorded as sent;
        and a test send, one real message to your own pauseai.uk
        address by Postmark, as a chosen recipient would get it,
        logged as `mailing-test`, skipping permissions. Once a channel
        is built, test sends go by it. "Leave out" takes one person out
        of this mailing, with a reason saved with it.
     4. Schedule: when it goes, and a summary with the sender and the
        cost.
   - Drafts. A mailing becomes a draft at the first change worth
     keeping: writing in the subject or letter, attaching a file, or
     leaving someone out. Until then nothing is saved. A draft saves
     itself a moment after each change, with a version number so a
     second person editing it is told rather than overwritten. A draft
     with no subject or letter is deleted after a day unopened. "Delete
     draft" deletes it after one confirmation; a draft has sent
     nothing, so it isn't archived.
   - A scheduled mailing's page has Stop, which turns it back into a
     draft, or once sending has started sends no more. A sent mailing
     can't be deleted.
   - A mailing's page, with each recipient's outcome, the counts, and
     its filter as read-only pills.
   - The mailings list, with both audiences and a Drafts tab.
