# Mailings

Staff filter a list, press "Mail these", write a mailing and schedule
it. This plan builds what every mailing shares. Each channel's sending
has its own plan:

- `plans/politician-email.md`: politicians, by Gmail.
- `plans/supporters-email.md`: supporters, by email.
- `plans/supporters-phone.md`: supporters, by text and WhatsApp.

One pull request, blocked by nothing. Once merged, staff on the live
site can make a mailing, dry-run it and test-send it to themselves.
Scheduling turns on for each channel as its plan lands.

## What's there

- `mailings`: title, ask, and how Airtable's were found
  (`airtable_field` or `airtable_sent_between`). Every row is imported.
- `pauseai_letters`: one politician's letter of a mailing, a kind of
  `letters`.
- `/staff/mailings` and a mailing's page, for the imported ones
  (`lib/server/mailings.ts`).
- `send()` in `lib/server/email.ts`: Postmark only; refuses blocked
  addresses; logs to `email_sends`.
- `contact_permission(topic, channel, address)`: yes, unsure or no, for
  email and phone.
- `SupporterFilter` and `PoliticianFilter`: each list's filters, read
  from its URL, mixed with sort and page.

## Model

`mailings` is the parent. Recipients are a child table per audience, as
`letters` has `supporter_letters` and `pauseai_letters`:

```
mailings ──┬── pauseai_letters      politicians (exists)
           └── supporter_messages   supporters (new)
```

- **`mailings`** gains audience (`politicians`, `supporters`), channel
  (`email`, `whatsapp`, `text`), the stored filter, the template and its
  bindings, who made it, the sender, when it's due, and its state
  (`draft`, `scheduled`, `sending`, `sent`, `cancelled`). A CHECK lets
  only imported mailings lack a template.
- **`supporter_messages`**: the supporter, the address or number,
  status (`scheduled`, `sent`, `delivered`, `failed`, `skipped`), the
  provider's ID, the merge values, and why it was skipped. Erasure
  deletes the address and merge values and keeps the row.
- **`message_events`**: what happened to a message after sending, for
  either child.

A message's text isn't stored. It's the template plus the recipient's
merge values, and the mailing keeps the template as rendered when sent.

## Rules

- **Recipients are fixed at scheduling**, a row each, so who got it
  never depends on rerunning a filter.
- **Each send is checked again.** Supporters by `contact_permission()`
  for the mailing's topic; politicians by blocks and being in office.
  Anyone who fails is skipped, with the reason.
- **Who can see a list can mail it.** Any staff account can mail
  politicians; only the `supporters` permission can mail supporters.
- **A stored filter is read strictly.** A value it doesn't recognise
  stops the mailing, saying which, so a renamed topic or deleted event
  can't widen the audience.

## Steps

1. **Stored filters.** Who a list shows, split from how it's shown, as
   one validated value for supporters and for politicians, stored as
   JSON. A mailing's page shows it in words and can rerun it.
2. **Templates.** Email your MP's format (`lib/letter-format.ts`) plus
   merge fields and blocks only some see (`[if signed
   frontier-ai-letter] … [end]`). Anyone a field can't be filled for is
   skipped.
3. **Channels.** `Channel` is a type: send one message, say how many
   more today, say what a message costs, and turn a provider's report
   into an event. Each has a fake for fixture builds, dev and tests,
   which writes to the outbox (`tests/fixtures/outbox.ts`) and lets a
   test report delivery, failure, bounces, opt-outs and replies through
   the webhook's code. This plan uses the fake email that exists.
4. **The `send-mailings` job**, hourly, in the shared database wake.
   Each run sends what fits in 30 seconds.
5. **Staff pages**, designed first as mock-ups on the real staff
   components, desktop and phone:
   - "Mail these" on Politicians and Supporters;
   - a new mailing: recipients with untick boxes, channel, template,
     preview as any recipient, what it will cost, schedule, cancel;
   - **dry run**: who it would go to, who would be skipped and why,
     with nothing recorded as sent;
   - **test send to yourself**: a real message as a chosen recipient
     would get it, to your pauseai.uk address by Postmark, logged as
     `mailing-test`, skipping the permission check. Once a channel is
     built, its test send uses it;
   - a mailing's page: each recipient's outcome, counts, the filter in
     words;
   - Mailings: both audiences in one list.
