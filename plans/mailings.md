# Mailings

Staff filter a list, press a button, write a mailing and schedule it.
This plan builds what every mailing shares, up to scheduling. Each
channel's real sending comes after, in its own plan:

- `plans/politician-email.md`: politicians, from a staff member's Gmail.
- `plans/supporters-email.md`: supporters, by email.
- `plans/supporters-phone.md`: supporters, by text and WhatsApp.

One pull request. Nothing outside blocks it. Once it's merged, staff on
the live site can make a mailing, dry-run it and test-send it to
themselves; scheduling turns on for a channel when its plan lands.

## What's there

- `mailings`: title, ask, and where Airtable's ones came from
  (`airtable_field` or `airtable_sent_between`). Every row is imported.
- `pauseai_letters`: one politician's letter of a mailing, a kind of
  `letters`.
- `/staff/mailings` and a mailing's page, listing the imported ones and
  their recipients (`lib/server/mailings.ts`).
- `send()` in `lib/server/email.ts`: Postmark only, refuses blocked
  addresses, logs to `email_sends`.
- `contact_permission(topic, channel, address)`: yes, unsure or no, for
  email and phone. Phone numbers are compared as `phone_number()` writes
  them, E.164 where it can.
- `SupporterFilter` and `PoliticianFilter`: each list's filters, parsed
  from its URL, with sort and page mixed in.

## The model

A mailing is the parent; who it went to is a child table per audience,
as `letters` has `supporter_letters` and `pauseai_letters`.

```
mailings ──┬── pauseai_letters      politicians (exists)
           └── supporter_messages   supporters (new)
```

- **`mailings`** gains: audience (`politicians`, `supporters`), channel
  (`email`, `whatsapp`), the stored filter, the template and
  what it binds, who made it, the sender, when it's due, and its state
  (`draft`, `scheduled`, `sending`, `sent`, `cancelled`). Imported
  mailings are `politicians` and `email`, and a CHECK lets only them lack
  a template.
- **`supporter_messages`**: one supporter's message. The supporter, the
  address or number, status (`scheduled`, `sent`, `delivered`, `failed`,
  `skipped`), the provider's ID, the merge values, and why it was
  skipped. Erasure deletes the address and merge values and keeps the
  row.
- **`message_events`**: what happened to each message after it was sent,
  for either child.

A message's text isn't stored: it's the mailing's template with the
recipient's merge values. The mailing keeps the template as rendered
when sent, so a change to the renderer can't change it.

## Rules

- **Recipients are fixed when it's scheduled**, a child row each, so who
  got it never depends on rerunning a filter.
- **Every send is checked again at send time.** Supporters by
  `contact_permission()` for the mailing's topic; politicians by blocks
  and being in office. Anyone who fails is skipped, with the reason.
- **Who can send is who can see the list.** Any staff account can mail
  politicians; only one with the `supporters` permission can mail
  supporters. No new permission.
- **A stored filter is read strictly.** A URL drops what it doesn't
  know; a mailing refuses the whole filter and says which value failed,
  so a renamed topic or deleted event can't widen the audience.

## Steps

1. **Stored filters.** Split who a list shows from how it's shown, for
   supporters and politicians, into one validated value a mailing stores
   as JSON. A mailing's page shows it in words and reruns it to show who
   it would pick now.
2. **Templates.** Email your MP's format (`lib/letter-format.ts`), plus
   merge fields per recipient and blocks only some see (`[if signed
   frontier-ai-letter] … [end]`). A field the site can't fill for
   someone skips them.
3. **Channels.** `Channel` is a type: send one message, how many more
   today, and turn a provider's report into an event. Each real channel
   has a fake one for fixture builds, dev and tests, which writes what it
   would send to the outbox (`tests/fixtures/outbox.ts`) and lets a test
   report what happens next (delivered, failed, bounced, opted out,
   replied) through the same code a webhook uses. This plan uses the
   fake email that exists.
4. **The `send-mailings` job**, hourly, in the database wake the other
   jobs share. It sends what fits in 30 seconds and leaves the rest.
5. **Staff pages**:
   - "Mail these" on Politicians and Supporters.
   - New mailing: recipients with untick boxes, channel, template,
     preview as any recipient, schedule, cancel.
   - **Dry run**, on any channel: who it would go to, who would be
     skipped and why, then stop. Nothing is recorded as sent.
   - **Test send to yourself**: a real message, rendered as a chosen
     recipient would get it, to your own pauseai.uk address through
     Postmark's ordinary stream, logged as `mailing-test`. It isn't a
     recipient and skips the permission check. Once a channel is built,
     its test send goes by that channel (from your Gmail, to your
     WhatsApp).
   - A mailing's page: each recipient's outcome, counts, and the filter
     in words.
   - Mailings: both audiences together.

   Designed first, as mock-ups on the real staff components, desktop and
   phone, for staff to choose from.
