# Mailings

Staff filter a list, press a button, write a mailing and schedule it.
This plan builds what every mailing shares, sent to a fake channel. The
channels come after, each in its own plan:

- `plans/politician-email.md`: politicians, from a staff member's Gmail.
- `plans/supporters-email.md`: supporters, by email.
- `plans/supporters-whatsapp.md`: supporters, by WhatsApp.

One pull request. Nothing outside blocks it.

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
  (`email`, `whatsapp`, `fixture`), the stored filter, the template and
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
   today, and turn a provider's report into an event. The fixture
   channel records sends and lets a test report delivery and failure.
4. **The `send-mailings` job**, hourly, in the database wake the other
   jobs share. It sends what fits in 30 seconds and leaves the rest.
5. **Staff pages**, on the fixture channel:
   - "Mail these" on Politicians and Supporters.
   - New mailing: recipients with untick boxes, channel, template,
     preview as any recipient, test send to yourself, schedule, cancel.
   - A mailing's page: each recipient's outcome, counts, and the filter
     in words.
   - Mailings: both audiences together.

   Designed first, as mock-ups on the real staff components, desktop and
   phone, for staff to choose from.

## Open questions

1. Who can send a mailing: a new permission beside `supporters` and
   `admin`, or anyone who can see the list?
2. Can a fixture-channel mailing exist on a live site, so staff can try
   the pages before a channel is built?
