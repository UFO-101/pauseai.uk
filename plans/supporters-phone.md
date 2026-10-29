# WhatsApp and texts to supporters

Mailings to supporters by WhatsApp, then by text message. This builds
on `plans/mailings.md`, whose phase 3 makes the staff pages for
messages to supporters, and is three pull requests:

1. The groundwork both channels need: consent, opt-outs and replies.
2. WhatsApp, which comes next, now that mailings to politicians are
   done.
3. Texts, for people who aren't on WhatsApp.

## What we have now

- `phone_number()` writes each number in the form we compare them in,
  E.164 where possible.
- `contact_permission()` answers for phone numbers. Each topic lists
  the ways it allows (`TOPIC_WAYS` in `lib/contact-permissions.ts`):
  `volunteering` and `site-forms` allow calls and texts, and
  `march-day` and `luma-calendar` allow texts. WhatsApp isn't a way
  yet.
- We have about 750 numbers. Roughly 470 are from volunteers on the
  join form, which allow calls and texts; numbers from the Tally form,
  before it asked what people wanted to do, count as volunteers' too.
  Roughly 320 are from Luma, nearly all from the November march and
  PauseCon 2025, and allow texts only. Only a handful are from our own
  march form, which went live on 28 October.
- The site doesn't send texts or WhatsApp messages. We have a giffgaff
  number with the WhatsApp Business app on Reuben's phone, but the app's
  broadcast lists only reach people who have saved our number. That's
  why this plan uses the API.

## Rules

- We only message someone in a way they said yes to. The ICO treats
  texts and messages in apps as electronic mail, and the soft opt-in
  doesn't cover political campaigning
  ([ICO](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/)).
  A yes to texts is a yes to WhatsApp too: to the people we message
  they're the same thing, a message to their phone. Meta accepts an
  opt-in that doesn't name WhatsApp, as long as it names us and the
  law is met
  ([opt-in](https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in)).
- A message stays within what the person agreed to. For example, a
  `march-day` text is about the march, sent on the day.
- Every message says how to stop, and a stop is honoured at once,
  whichever way it reaches us ("Opt-outs", below).
- Replies are shown on the supporter's page and answered from the site,
  so nobody needs the phone itself.

## Opt-outs

PECR wants a simple way to opt out in every message, acted on promptly
(ICO, above). Meta wants every request to stop honoured, on WhatsApp or
off it, and clear instructions for how to stop
([policy](https://whatsappbusiness.com/policy/)). The ways a stop can
reach us:

- **WhatsApp's own controls.** A person can stop, and later resume,
  marketing messages from us in WhatsApp's "Offers and announcements"
  setting. Meta tells us by the `user_preferences` webhook, for both
  stop and resume
  ([webhook](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/user_preferences)).
  Sending a marketing message to someone who has stopped fails with
  error 131050.
- **A "Stop" button.** Every marketing template has a quick-reply
  button to stop, which comes back to the webhook as a reply we can
  recognise.
- **Blocking or reporting us** in WhatsApp. Meta doesn't tell us who;
  messages to them stop being delivered, and our quality rating drops.
  A number whose messages are never delivered is skipped after a few
  tries, as a number not on WhatsApp is.
- **A reply in words.** A text of STOP, or anything like it, is an
  opt-out; some text providers handle STOP themselves and tell us by
  webhook. On WhatsApp, a reply like "stop" or "unsubscribe" is an
  opt-out too. Anything less clear, such as "not interested", is shown
  to staff on the supporter's page with a button to record it as an
  opt-out.
- **Anywhere else**: an email, a word at an event, a call. Staff record
  it on the supporter's page, with a note of how it was given.
- **A page on pauseai.uk**, linked from each message, where someone can
  stop by number, and choose what to stop, as `plans/supporters-email.md`
  offers fewer emails before none.

Each opt-out goes in `opt_outs`, with the way it came by and its source
(`whatsapp-webhook`, `text-provider`, `reply`, `staff`, `site`), so
`contact_permission()` answers no from then on and `contact_unsubscribes`
lists it. It's kept after erasure, as other opt-outs are, so a number
we're given again is never messaged against its owner's wish. A resume
in WhatsApp's settings closes the opt-out it made, as `luma-contacts`
closes a Luma one; a yes given again on a form or to staff closes one
too.

A stop covers every topic, and texts and WhatsApp as one: a WhatsApp
stop stops texts too, and a text STOP stops WhatsApp messages. It
doesn't stop calls: someone may want no texts but be glad of a call
from their local group. Calls have their own stop ("Calls", below).

## 1. Groundwork

### The Luma checkbox

Luma's phone field doesn't tell people what their number will be used
for; that's left to the host. Each event can make the field off,
optional or required. If someone's Luma profile already has a number,
optional and required look the same to them. PauseCon required a number,
and nearly everyone gave one. The march made it optional, and about one
in six people gave one. Most other events haven't asked at all. So a
number from Luma only allows what that event said it was for, which is
usually its reminders.

The proposal, to be decided with Joseph, is to ask for a number on
every event, with a checkbox on every event's registration form.
Ticking it would give the same permission as joining as a member: the
weekly email, WhatsApp messages and texts about events, and later calls
from volunteers. It only reaches people as they register, so we would
ask existing Luma contacts with a calendar newsletter linking to a page
on pauseai.uk where they can say yes. We will measure what share give a
number and tick the box on each event. If it's low, we will ask for
less, starting with the weekly and event messages.

### Steps

1. Add WhatsApp as a way to contact someone, alongside calls and texts,
   allowed by every topic that allows texts.
2. Collect opt-ins: the box on Email your MP and our other forms; the
   Luma checkbox, which the import reads as it reads the postcode
   question; and a way for staff to record a yes given in person or
   elsewhere, with a note on how it was given.
3. Record opt-outs ("Opt-outs", above): the new sources, the way each
   came by, staff recording one by hand, and the page on pauseai.uk.
4. Mark a number that turns out not to be a mobile, or not to be on
   WhatsApp, and skip it in future.
5. Store each reply in a new `message_replies` table, with the message
   it answers, and show it on the supporter's page with a reply box.
   Staff answers are stored there too. Anyone with the `supporters`
   permission can reply, and each reply records who sent it.

## 2. WhatsApp

### Applying

Meta doesn't allow political parties, politicians, candidates or
political campaigns ([policy](https://whatsappbusiness.com/policy/)).
PauseAI UK is none of those: it's a civil society organisation that
runs events and volunteers' actions, as many nonprofits on WhatsApp do.
The application should show that plainly and consistently:

- A Meta business portfolio for Safe AI Alliance Ltd, verified. Meta
  needs the certificate of incorporation, which is on Companies House,
  and a document showing the company's name and address, such as a bank
  statement, which Joseph can provide. pauseai.uk already names the
  company on its donate, press and privacy pages, so the website
  matches the documents. An unverified account can message 250 people a
  day, and a verified one 2,000
  ([limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits)).
- "PauseAI UK" as the display name, matching the website
  ([display names](https://developers.facebook.com/documentation/business-messaging/whatsapp/display-names)).
- A complete business profile: a description of what we do in civil
  society terms (events, volunteering, public awareness of AI risk), the
  website, an email address and the nonprofit category.
- Two-step verification on the number, and Francis and Joseph as
  admins.
- A system user with a permanent access token, and a payment method.

Then, once sending works, to keep the account in good standing:

- Send first to the people most likely to want it: staff, then
  volunteers, then one local group, before
  anyone else.
- Keep the first templates useful and expected, such as an event
  reminder, and watch each template's quality rating, which Meta lowers
  for blocks, reports and messages left unread
  ([quality](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-quality)).
- Make stopping easy, with a button in every marketing template, so
  people stop rather than block or report us.

### Steps

1. Add the WhatsApp channel in `lib/server/outside-services/whatsapp.ts`,
   with a fake version for tests. Marketing messages are sent through
   the Marketing Messages API, because the Cloud API stops sending them
   on 13 October 2027
   ([overview](https://developers.facebook.com/documentation/business-messaging/whatsapp/marketing-messages/overview.md)).
   Meta charges for each delivered message, at a rate that depends on
   its category
   ([rate card](https://whatsappbusiness.com/products/platform-pricing/)).
2. Templates. Staff write each template on the site, with a name, a
   category, the language `en_GB`, a body with named parameters, and a
   "Stop" button on marketing templates. The site submits it to Meta,
   whose review can take up to 24 hours. The site reads templates back
   hourly and from Meta's status webhook, so a template Meta pauses
   stops the mailings that use it. Only approved templates can be sent
   ([templates](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview)).
3. The webhook at `/api/whatsapp` checks each request's
   `X-Hub-Signature-256`
   ([webhooks](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint.md)).
   - Sent, delivered, read and failed statuses are recorded in
     `message_events`.
   - Opt-outs and resumes, as in "Opt-outs" above: `user_preferences`,
     error 131050 and the "Stop" button. Error 131026 means the number
     isn't on WhatsApp. Error 131049 (WhatsApp's limit per person) is a
     failure that isn't retried
     ([errors](https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes)).
   - Errors about our account, such as a paused template, a payment
     problem or a restriction, stop the mailing and alert staff, as does
     a drop in quality rating (`phone_number_quality_update`,
     `message_template_quality_update`).
   - Replies are stored for the supporter's page.
4. Within 24 hours of the person's last message, staff can reply with
   free text, at no charge
   ([pricing](https://developers.facebook.com/docs/whatsapp/pricing)).
   After that, a reply must use an approved template.

## 3. Texts

1. Add a text provider in `lib/server/outside-services/`, with a fake
   version for tests. Texts are sent from a real UK number, because
   people can't reply to a sender name such as "PauseAI UK".
2. Texts are free text, with no approval step. Each ends with how to
   stop, such as "Reply STOP to stop". The new message page counts
   160-character segments, because each one is charged.
3. The provider's webhook records deliveries and failures in
   `message_events`, records STOP as an opt-out, and stores other
   replies for the supporter's page.
4. Staff can reply to a text at any time. Each reply is charged as a
   text.

## Calls

Not built here, but the permissions already say who allows calls. Calls
aren't automated: volunteers make them, as local groups do now, from
numbers staff give them. A number is never offered for calling when it
has a stop for calls, which comes two ways, apart from messages:

- **The TPS.** A number on it isn't called, unless the person told us
  by name that they're happy to be called (below).
- **Someone asking not to be called**, usually on a call. The volunteer
  who called, or staff, records it, with a note of how it was given.
  Like other stops, it's kept after erasure.

The Preference Service only matters for live calls, not texts or
WhatsApp. We may call a number on the TPS only if that person told us,
PauseAI UK by name, that they're happy to get our calls, and we have a
record of it
([ICO](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-direct-marketing-using-live-calls/how-do-we-comply-with-the-rules-on-live-marketing-calls/)).
The join form is Stichting PauseAI's, so a volunteer's number may not
meet that. Before any tool shows staff numbers to call, check each one
against the TPS through an API, such as
[Data Soap](https://www.datasoap.co.uk/developer/validation-api)'s,
and again before each round of calls, since a new registration takes up
to 28 days to count.

## Data protection

Record in `docs/data-protection.md`: a new use of phone numbers, only
for people who said yes to that way; the new opt-in sources; the text
provider and Meta as processors of numbers, messages and delivery
receipts; read receipts from Meta, which are new data about a person;
opt-outs kept after erasure; replies, stored and shown to staff, and
deleted on erasure; and, with calls, the TPS checker as a processor.

## Not in this plan

WhatsApp groups and Communities, pictures and attachments, texts or
WhatsApp messages to politicians, and a calling tool.

## Open questions

1. Which number for WhatsApp? The giffgaff number could go on the API
   and stay in the WhatsApp Business app on Reuben's phone through
   Meta's Coexistence feature. Connecting it unlinks WhatsApp Web,
   which can then be linked again
   ([Infobip](https://www.infobip.com/docs/whatsapp/manage-integration/coexistence)).
   Or a new number just for the API.
2. What should the checkbox say? The same words should be used on Luma
   and our own forms, and a person needs to write them. They need to
   name PauseAI UK, and say messages and calls.
3. How does a volunteer who isn't on staff record a stop for calls:
   by telling staff, or on a page of their own for the numbers they
   were given?
4. Should a resume in WhatsApp's settings undo any stop of messages, or
   only one made in WhatsApp's settings, leaving a "Stop" button, a
   "stop" reply or a text STOP in force?
5. People with a WhatsApp username can hide their number from
   businesses, and Meta's webhooks then identify them only by an ID it
   gives each person for our business. Do we store that ID against the
   number when we send, so a later stop can be matched?
6. Which text provider, and can it take over the giffgaff number?
