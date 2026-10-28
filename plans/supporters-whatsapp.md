# Mailings to supporters, by WhatsApp first

Staff filter the supporters page, press "Message these", pick a template
and send it. This plan builds that for WhatsApp, through Meta's
WhatsApp Business Platform. The mailing is built so Postmark, a staff
member's Gmail and other channels can be added later without changing
it. Only WhatsApp is built now.

Mailings to politicians (`plans/politician-mailings.md`, phase 2) and
the UK weekly email (`plans/supporters-email.md`) are the same idea
for other audiences and channels. Whichever is built first makes the
shared parts: the mailing tables, the stored filter and the send job.

Three phases, one pull request each:

| Phase              | What staff get                                                              |
| ------------------ | --------------------------------------------------------------------------- |
| 1. Groundwork      | Who has said yes to WhatsApp, and mailings sent to a fake WhatsApp          |
| 2. WhatsApp        | Templates registered with Meta, real sends, delivery and opt-outs            |
| 3. First mailing   | A small real mailing, then the rest                                          |

Phase 1 needs nothing from Meta, so it can be built while the account is
set up and the policy question below is answered.

The supporters list's "not at event" filter is a separate pull request
(branch `supporters-not-event`), so this plan only uses it.

## Blockers, before any code

1. **WhatsApp may not allow us at all.** Its Business Messaging Policy
   says: "We prohibit the use of the WhatsApp Business Platform by
   Political Parties, Politicians, Political Candidates, and Political
   Campaigns", and also by "entities that offer services related to
   politics" ([policy](https://whatsappbusiness.com/policy/)). PauseAI UK
   is no party or candidate. But "political campaigns" isn't defined,
   and we lobby MPs. I don't know whether Meta would count us. It has to
   be asked of Meta, or of a Solution Provider who can ask for us, before
   anything is built against the real API. A ban later would take the
   number and its history with it.
2. **Nobody has said yes to WhatsApp.** WhatsApp needs an opt-in that
   names the business and says the person will get messages from it
   ([opt-in](https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in.md)).
   UK law needs it too. The ICO's guidance treats texts, and "direct
   messages via social media or any similar message that is stored
   electronically", as electronic mail. It says the soft opt-in doesn't
   cover "political campaigning", so we need specific consent
   ([ICO](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/)).
   That guidance is under review after the Data (Use and Access) Act
   2025. A phone number given for a Luma event, or on the join form, is
   not a yes. So the list starts empty and grows from new opt-in boxes
   (phase 1, step 3).

## Rules

- **A message goes only to a yes.** `whatsapp_permission()` is the one
  place that says whether we may message a number, as
  `email_permission()` is for addresses. A no always wins over a yes.
- **The mailing doesn't know the channel's details.** It stores what
  staff chose. A channel's child table stores what only that channel
  needs, as `politicians` adds to `notable_people`.
- **The database enforces everything**, as in the politicians plan:
  typed columns, constraints, no key/value fields.
- **No copy in code that hasn't been written by a person.** Template text
  is copy. Staff write it, and Meta reviews it.

## Channels

A channel is how a message reaches someone. Each has its own kind of
address and its own way of saying what happened:

| Channel    | Address       | Content                                  | Backends            | Built |
| ---------- | ------------- | ---------------------------------------- | ------------------- | ----- |
| `whatsapp` | E.164 phone   | A Meta-approved template and its values  | Cloud API, fixture  | now   |
| `email`    | Email address | Subject, body template, attachments      | Postmark, Gmail     | later |

In code, `Channel` is a type: send one message to one address, how many
more it may send today, and turn a provider's report into an outcome
(delivered, read, failed and why). `whatsapp()` and `fixtureWhatsapp()`
return plain objects of that type, as `postmark(stream)` and
`gmail(account)` will. The politicians plan's `MailBackend` is the email
channel's backend, under the same type.

## Data model

```
mailings ──┬── mailing_whatsapp     (later: mailing_email)
           │
           └─→ supporter_messages ─→ supporters
                    └─→ message_events

whatsapp_templates ←── mailing_whatsapp
whatsapp_opt_ins, whatsapp_opt_outs ─→ phone numbers
```

- **`mailings`** gains `audience` (`politicians` or `supporters`),
  `channel`, `filter` (below), who made it, when it's due, and its state
  (`draft`, `scheduled`, `sending`, `sent`, `cancelled`). Airtable's
  imported mailings are `politicians` and `email`, and keep the CHECK
  that lets only them lack content.
- **`mailing_whatsapp`**: the template, and each of its parameters bound
  either to a merge field (below) or to one fixed text for the whole
  mailing. A CHECK makes every parameter the template has bound exactly
  once.
- **`supporter_messages`**: one supporter's message of a mailing, fixed
  when it's scheduled. The supporter, the address it went to, its status
  (`scheduled`, `sending`, `sent`, `delivered`, `read`, `failed`,
  `skipped`), the provider's ID (WhatsApp's `wamid`), and the merge
  values used. The text isn't stored; it's the template with these
  values. Erasure deletes the row's merge values and address, and keeps
  the count.
- **`message_events`**: what happened to each message, with the
  provider's code and words: sent, delivered, read, failed, skipped (and
  why), replied.
- **`whatsapp_templates`**: every template Meta has for our account,
  copied from it. Meta's ID, name, language, category (`marketing`,
  `utility`), status (`APPROVED`, `PENDING`, `REJECTED`, `PAUSED`,
  `DISABLED`), quality, the body text, its parameter names, and the
  rejection reason. Only an `APPROVED` one can be sent
  ([templates](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview)).
- **`whatsapp_opt_ins`** and **`whatsapp_opt_outs`**: each yes and no to
  WhatsApp, with the number, when, and where it came from. Never changed,
  like `email_problems`. An opt-out is kept after erasure, as email
  opt-outs are.
- **`whatsapp_permission()`** and its view: for each supporter's number,
  `yes`, `no` or `not-asked`, the reason, and since when. A no comes
  from an opt-out, from WhatsApp saying they stopped our marketing
  (131050), or from WhatsApp saying the number isn't on it (131026).

### Phone numbers

Luma gives E.164. The members import gives whatever was typed. Each
number is normalised to E.164 at import, UK by default, with
`libphonenumber-js`. A number that won't parse is kept as typed and can't
be messaged. Only mobiles can have WhatsApp, but that can't be known
until a send fails with 131026.

### Merge fields

A template's parameters are named, such as `{{first_name}}`
([templates](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview)).
A parameter is bound to one of a fixed list the site can fill per
supporter: first name, their nearest local group, their nearest next
event. One the site can't fill for someone skips them, with the reason.
Or it's bound to one text for everyone, such as an event's link.

### The stored filter

The politicians plan's step: a list's filters become one structured,
validated value. `SupporterFilter` today mixes who is in the list with
how it's shown (`sort`, `dir`, `page`). Split it into `SupporterQuery`,
who, which a mailing stores as JSON checked by one validator, and how
it's shown. A mailing's page shows its filter in words, and reruns it
to show who it would pick now. Recipients are fixed at scheduling, not
re-chosen at send time.

Reading a stored filter is strict. The list's URL parser drops what it
doesn't know, which is right for a link but wrong for a mailing: a
value it no longer recognises (a renamed topic, a deleted event, a
campaign gone) would be dropped silently and widen the audience. So
the validator refuses the whole filter, saying which value failed, and
the mailing can't be scheduled or rerun until someone fixes it. Its
words on the mailing's page come from the same reading, so a filter
that can't be read says so rather than showing fewer conditions.

The mailing stores who it actually went to, not only the filter:
`supporter_messages` has a row per recipient, fixed at scheduling, so
"who got this" never depends on rerunning a filter over data that has
since changed.

## Phase 1: Groundwork

1. **The "has phone" filter.** It exists (`phone=yes`, `s.phone IS NOT
   NULL`). A WhatsApp mailing needs more: a number that parses and a yes.
   The supporters list gets a WhatsApp state in the Subscriptions filter
   (`whatsapp:yes`, `whatsapp:no`, `whatsapp:not-asked`), and "Message
   these" on WhatsApp keeps only `whatsapp:yes`. The ones it leaves out
   are counted, by reason, on the new mailing's page.
2. **Phone numbers in E.164**, as above, in a new migration, with the
   unparseable ones counted on the Import page.
3. **Opt-in sources.** Each needs its copy written and the data
   protection agreed (below):
   - a box on the site's own join form and on Email your MP: "PauseAI UK
     may message me on WhatsApp";
   - a Luma registration question with the same words, which the Luma
     import reads, as it reads the postcode question;
   - staff, from a supporter's page, recording a yes given another way,
     with a required note on how.
4. **`whatsapp_permission()`**, its view, and a WhatsApp line in a
   supporter's page's subscriptions card.
5. **Mailings for supporters**: the tables above, with a fixture
   WhatsApp channel that records sends and lets a test report delivery,
   reads and failures.
6. **The `send-messages` job**, hourly, in the database wake the other
   jobs share. It sends what fits in 30 seconds and leaves the rest. At
   send time it checks `whatsapp_permission()` again, and skips and logs
   anyone who's said no since scheduling.
7. **Staff pages**, on the fixture channel:
   - **Supporters**: "Message these", for staff who can send.
   - **Mailings** (`/staff/mailings`) lists supporters' mailings beside
     politicians', with audience and channel.
   - **New mailing**: the recipients, with untick boxes; the channel
     (WhatsApp only, for now); the template; each parameter's binding;
     a preview as any recipient; a test send to your own number; schedule
     and cancel.
   - **A mailing's page**: every recipient's outcome, counts sent,
     delivered, read, failed and skipped, and its filter in words.
   - **A supporter's page**: their messages, with each one's outcome.

   Design these as the politicians plan says, as mock-ups on the real
   staff components to choose from, sharing one design with the
   politicians' mailing pages.

## Phase 2: WhatsApp

### Setting up, by an admin

Meta's side, done by hand before the code can be tried for real:

- A Meta business portfolio for Safe AI Alliance Ltd, and **business
  verification**. Without it the portfolio can message 250 unique people
  a day. Verified, it goes to 2,000, and up from there on good quality
  ([limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits)).
  An unverified one is also limited to 250 templates.
- A WhatsApp Business Account, and a phone number for it that isn't in
  the WhatsApp app, with the display name "PauseAI UK" approved
  ([display names](https://developers.facebook.com/documentation/business-messaging/whatsapp/display-names.md)).
- A Meta app with the WhatsApp product, a system user with a permanent
  token (`whatsapp_business_messaging`, `whatsapp_business_management`),
  and a payment method.
- Accepting the Marketing Messages API terms (below).

### Steps

1. **The WhatsApp channel**, in
   `lib/server/outside-services/whatsapp.ts`, the only file that talks to
   Meta. Marketing templates go to `/{phone-number-id}/marketing_messages`
   and utility ones to `/{phone-number-id}/messages`
   ([onboarding](https://developers.facebook.com/documentation/business-messaging/whatsapp/marketing-messages/onboarding)).
   Cloud API stops sending marketing messages on 13 October 2027, and
   accounts made from 13 April 2027 can't send them there at all
   ([Marketing Messages API](https://developers.facebook.com/documentation/business-messaging/whatsapp/marketing-messages/overview.md)).
   Most of what we'd send (events, calls to act) is marketing, so it goes
   the new way from the start.
2. **Templates registered with Meta.** Staff write a template on
   `/staff/whatsapp-templates`: name, category, language (`en_GB`), body
   with named parameters, and a "Stop promotions" button on every
   marketing one. The site submits it (`POST /{waba-id}/message_templates`)
   and shows Meta's review, which can take up to 24 hours, and the
   reason if it's rejected. The site reads every template back hourly,
   and from Meta's `message_template_status_update` webhook, so a paused
   or disabled one stops any mailing that uses it.
3. **The webhook**, at `/api/whatsapp`: Meta's GET challenge, and POSTs
   checked against `X-Hub-Signature-256` with the app secret
   ([webhooks](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint.md)).
   It reads:
   - **statuses**: `sent`, `delivered`, `read`, `failed` with its errors
     ([statuses](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/messages/status.md)),
     each a `message_events` row;
   - **errors that are about the person**: 131050 (they stopped our
     marketing) is an opt-out; 131026 (not on WhatsApp, or can't receive)
     marks the number unusable; 131049 (held by WhatsApp's per-person
     marketing limit) is a failure not retried
     ([error codes](https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes));
   - **errors that are about us**: 132001 and 132015 (template missing or
     paused), 131042 (payment), 368 and 131031 (account restricted). Each
     stops the mailing and alerts staff, as the jobs alert now;
   - **the "Stop promotions" button**, and a reply of "stop" or
     "unsubscribe", are opt-outs;
   - **any other reply** is forwarded to a staff inbox by email and
     logged as a `replied` event, as replies to supporters' letters are.
     Its text isn't stored.
4. **The send job** sends through the real channel. Throughput isn't the
   limit; the portfolio's daily cap is, so the job stops at it and
   carries the rest to the next day, saying so on the mailing's page.

### Cost

Meta charges each delivered message by its category and the recipient's
country. Replies inside 24 hours of a person's message are free
([pricing](https://developers.facebook.com/docs/whatsapp/pricing)). I
couldn't read the UK marketing rate from Meta's interactive rate card.
Third-party sites put it at about US$0.05–0.06 a message, so about $50–60
per thousand. Check it on
[Meta's rate card](https://whatsappbusiness.com/products/platform-pricing/)
before budgeting. Also, WhatsApp limits how many marketing messages
anyone gets from all businesses, so some won't arrive (131049).

## Phase 3: First mailing

A real mailing to staff and a few volunteers who've said yes. Then one
to a local group, before anything bigger, watching the template's
quality rating and the blocks. A low rating pauses the template, and
blocks lower the account's quality, which is shared by everything the
number sends.

## Tests

Phase 1: the WhatsApp states in the supporters filter, a stored filter
validated and shown in words, scheduling that fixes the recipients, a
supporter who opts out between scheduling and sending, a parameter that
can't be filled for one recipient, and erasure keeping an opt-out.
Phase 2: the webhook's signature, every status and every error code
above, against a fake Meta. A template rejected, approved, then paused
mid-mailing. The daily cap carried over. Storyboard flows for "Message
these" through to a mailing's page, and a template's review; gallery
examples for new components; a line each in `docs/testing.md`.

## Data protection

To be agreed before phase 1, step 3, and recorded in
`docs/data-protection.md`, the privacy policy and erasure:

- **A new use of phone numbers**: messages on WhatsApp, only to a yes.
- **New opt-in sources**: the join form's box, Email your MP's box, the
  Luma question, and staff recording a yes.
- **Meta as a processor** of the numbers we message, the messages, and
  delivery and read receipts. A read receipt is a new kind of data about
  a person.
- **Opt-outs kept after erasure**, as email opt-outs are.
- **Replies forwarded, not stored**, as replies to supporters' letters
  are.

## Not in this plan

- Email, Gmail and Postmark as channels for supporters' mailings. The
  channel type allows them; the UK weekly plan and the politicians plan
  build them.
- Free text messages. They're allowed only inside 24 hours of a person's
  message ([pricing](https://developers.facebook.com/docs/whatsapp/pricing)),
  so they belong with a reply inbox.
- A reply inbox in the site, and two-way chat.
- WhatsApp groups and Communities. The site's community link stays as it
  is.
- Media headers and per-person attachments.
- Meta's Coexistence, which lets one number be in the Business app and on
  the API.
- Messaging politicians on WhatsApp.

## Open questions

1. **Does Meta count PauseAI UK as a political campaign?** Who asks, and
   do we go through a Solution Provider so someone can ask for us?
2. **Who sets up Meta**, with the company's verification documents?
3. **A new number**, or one we already have? It can't stay in the
   WhatsApp app once it's on the API.
4. **The opt-in words** and where they go. Is one box for all WhatsApp
   messages enough, or should it be by kind (events near you, urgent
   actions), as WhatsApp's best practice suggests?
5. **Who can send a mailing.** A new permission, or anyone who can see
   supporters?
6. **Where replies go**: which inbox, and who answers them, given no
   inbox in the site.
7. **A budget**, once the UK rate is known.
