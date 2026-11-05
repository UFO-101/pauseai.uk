# Texts to supporters

Messages to supporters by text, on the staff pages in
`plans/mailings.md`. A message is by email or by text. A text is sent
by WhatsApp, and perhaps later by SMS to numbers not on WhatsApp.
Two pull requests, and an optional third:

1. Groundwork: consent, opt-outs and replies.
2. The WhatsApp backend, which comes next.
3. Optional: an SMS backend, for numbers not on WhatsApp.

## Now

- We have about 750 numbers. Roughly 470 are volunteers' from the join
  form, Tally-era ones included, and allow calls and texts. Roughly 320
  are from Luma, nearly all from the November march and PauseCon 2025,
  and allow texts only. More come from our march form, live since
  28 October, whose box allows calls and texts.
- `contact_permission()` answers for numbers, and `TOPIC_WAYS` in
  `lib/contact-permissions.ts` says which ways each topic allows: calls,
  texts or both. A member's number since 30 June 2026 with no volunteering
  intent is unsure.
- `opt_outs` takes numbers, but only from Luma.
- The site doesn't send texts. Our giffgaff number has the WhatsApp Business
  app on Reuben's phone, but its broadcast lists only reach people who
  have saved the number, so we need the API.

## Rules

- We only message someone in a way they said yes to. The ICO treats
  SMS and app messages as electronic mail, and the soft opt-in doesn't
  cover political campaigning
  ([ICO](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/)).
- Text is one way to contact someone, whichever backend sends it, as
  it is to the people we message: a yes to texts allows WhatsApp and
  SMS, and a stop by either stops both. Meta accepts an opt-in that
  names us without naming WhatsApp
  ([opt-in](https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in)).
- A message stays within what the person agreed to: a `march-day` text
  is about the march, sent on the day.
- Every message says how to stop, and every stop is honoured at once.
- Replies are shown on the supporter's page and answered from the site,
  so nobody needs the phone.

## Opt-outs

PECR wants a simple way to stop in every message (ICO, above), and Meta
wants every request to stop honoured, however it's made
([policy](https://whatsappbusiness.com/policy/)). Stops reach us:

- From WhatsApp's "Offers and announcements" setting, by the
  `user_preferences` webhook, which reports resumes too
  ([webhook](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/reference/user_preferences)).
  A marketing message to someone who has stopped fails with error
  131050.
- From the "Stop" button on every marketing template.
- As a reply: STOP by SMS (some providers handle it and tell us by
  webhook), or "stop" or "unsubscribe" on WhatsApp. Anything less clear,
  such as "not interested", is shown to staff with a button to record it
  as a stop.
- Any other way, such as an email or a word at an event. Staff record
  it, with how it was given.

Blocking or reporting us in WhatsApp isn't reported to us. Messages to
that person stop being delivered, and a number never delivered to is
skipped after a few tries, as one not on WhatsApp is.

Each stop is a row in `opt_outs` with a new source (`whatsapp-webhook`,
`sms-provider`, `reply` or `staff`), so `contact_permission()` says no
for every topic from then on and `contact_unsubscribes` lists it, and
every text is checked just before it's sent, so one scheduled before
the stop is skipped with the reason (`plans/mailings.md`). It's kept
after erasure. A resume in WhatsApp's settings closes the stop it
made; a new yes, on a form or to staff, closes any.

These stops don't cover calls, which have their own ("Calls"). Global
doesn't call or text, so all of them are ours alone, though CiviCRM
has "Do not phone" and "Do not SMS" flags and its chapter contacts API
could carry phone stops later (`plans/supporters-email.md`).

## 1. Groundwork

### Asking on Luma

Luma's phone field doesn't say what a number is for, and each event can
make it off, optional or required. PauseCon required one and nearly
everyone gave it; the march made it optional and about one in six did;
most events don't ask. So a Luma number allows only that event's
reminders.

The proposal, to decide with Joseph, is to ask for a number on every
event, with a checkbox that gives the same permission as joining as a
member: the weekly email, texts about events, and
calls from volunteers. Existing Luma contacts are asked by a calendar
newsletter linking to a page on pauseai.uk. We measure how many tick it
on each event, and if it's few, ask for less, starting with the weekly
and event messages.

### Steps

1. Each message in a text records which backend sent it.
   `mailings.channel` loses `whatsapp`, leaving `email` and `text`.
2. Opt-ins: the Luma checkbox, which the import reads as it reads the
   postcode question; and staff recording a yes given elsewhere, with
   how it was given. Our forms' box already counts for a number they
   ask (`site-forms`); Email your MP asks for none.
3. Opt-outs, as above, including staff recording one by hand.
4. Mark a number that isn't a mobile, or isn't on WhatsApp, and skip it
   from then on.
5. A new source for `volunteering`, as a new member's number is unsure
   (open question 8).
6. Replies, in a new `message_replies` table with the message each
   answers, shown on the supporter's page with a reply box. Anyone with
   the `supporters` permission can reply, and each reply records who
   sent it.

## 2. The WhatsApp backend

### Applying

Meta doesn't allow political parties, politicians or political
campaigns (policy, above). PauseAI UK is a civil society organisation
that runs events and volunteering, as many nonprofits on WhatsApp do,
and the application should say so consistently:

- A verified Meta business portfolio for Safe AI Alliance Ltd. It needs
  the certificate of incorporation, from Companies House, and a document
  with the company's name and address, such as a bank statement, which
  Joseph can provide. pauseai.uk already names the company. A verified
  account can message 2,000 people a day, an unverified one 250
  ([limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits)).
- "PauseAI UK" as the display name
  ([display names](https://developers.facebook.com/documentation/business-messaging/whatsapp/display-names)),
  and a complete profile: what we do (events, volunteering, public
  awareness of AI risk), the website, an email address and the nonprofit
  category.
- Two-step verification, Francis and Joseph as admins, a system user
  with a permanent access token, and a payment method.

Then start gently: staff, then volunteers, then one local group. Keep
the first templates useful and expected, such as an event reminder, and
watch their quality rating, which drops with blocks, reports and
unread messages
([quality](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-quality)).
An easy Stop button means people stop rather than block us.

### Steps

1. The WhatsApp backend in `lib/server/outside-services/whatsapp.ts`,
   with a fake for tests. Marketing messages go through the Marketing
   Messages API, as the Cloud API stops sending them on 13 October 2027
   ([overview](https://developers.facebook.com/documentation/business-messaging/whatsapp/marketing-messages/overview.md)).
   Meta charges for each delivered message, by category
   ([rate card](https://whatsappbusiness.com/products/platform-pricing/)).
2. Templates. WhatsApp only sends approved templates, so a text uses
   one of the WhatsApp approved templates, picked in the writer, whose
   words show but can't be edited, or a new one, opened by the New
   template button. Scheduling a text on a new template sends it for
   approval and holds the text until Meta decides, usually within a
   day: its page and the list say it's scheduled and waiting. What
   happens then is under "Scheduling". Meta's reasons are codes, so the
   page says the code's meaning in plain words, and what to do when
   Meta recommends something. The site submits new words to Meta as a
   template: the `marketing` category (a utility template must be non-promotional and about the
   person's own booking or account, and Meta approves anything else as
   marketing anyway), `en_GB`, a body with named parameters for the
   merge fields, each with an example value, a footer saying how to
   stop, and a Stop quick-reply button, a common use Meta's docs give
   for one. The body can't start or end with a parameter, and
   one with the same body and footer as an existing template is
   rejected as a duplicate
   ([review](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-review)).
   The text then waits:
   - *Pending*: Meta decides within 24 hours. The site reads the status
     back hourly and by the `message_template_status_update` webhook.
   - *Approved*: the text goes at its time. Meta may have changed the
     category to marketing; the site records what it was approved as.
   - *Rejected*: the text is a draft again, showing the reason in
     plain words, and staff change the words and schedule it again, as
     often as needed, or appeal with a sample, decided within 24 hours.
   - *Paused* or *disabled*, after approval, on blocks, reports or
     low read rates: the text stops, and the words must change before
     it goes again.
   A template can be reused: a text can pick an approved one and fill
   its parameters, with no new review, which suits a weekly text
   whose fixed words rarely change and whose events are a parameter.
   A send names the template, not its ID, an edited template is reviewed
   again, and Meta's docs don't say whether it can be sent meanwhile. So
   the site never edits an approved template: new fixed words make a new
   template, and the old one stays approved until the new one is
   ([management](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/template-management)).
   An account can create 100 templates an hour and hold 250, or 6,000
   once verified
   ([templates](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview)).
   Without an SMS backend, a text skips numbers not on
   WhatsApp.
3. A webhook at `/api/whatsapp`, which checks `X-Hub-Signature-256`
   ([webhooks](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint.md))
   and:
   - records sent, delivered, read and failed in `message_events`;
   - records stops and resumes;
   - marks a number not on WhatsApp (error 131026), and doesn't retry
     WhatsApp's limit per person (131049)
     ([errors](https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes));
   - stops the text and alerts staff on a problem with our account,
     or a drop in quality (`phone_number_quality_update`,
     `message_template_quality_update`);
   - stores replies.
4. Staff can reply freely within 24 hours of the person's last message,
   at no charge, and after that only with a template
   ([pricing](https://developers.facebook.com/docs/whatsapp/pricing)).

### Scheduling

Scheduling a text submits its template, so staff write, pick a
time and leave it, rather than coming back once Meta has decided. From
then on the site sends by itself for three days from its scheduled
time, a fixed limit nobody sets. The writer and the scheduled page say
so quietly, in grey, under the time: "Will automatically stop sending
on Sun 15 Nov at 09:18". They say how many days the text
takes at the account's daily limit when it's more than one. Until then,
every copy that can go, goes:

- at the scheduled time, if the template is approved by then;
- as soon as approval arrives, if it comes later;
- the next day, for copies past the account's daily limit, and for
  people at WhatsApp's own limit (131049), which asks for a day's wait.

When the time runs out with copies unsent, the text stops, as one
stopped by hand does: the unsent copies are cancelled and listed under
Stopped with why, and the person who scheduled it gets an email saying
how many went and how many didn't. A template paused or disabled
before the time runs out stops the text the same way, at once, with
Meta's reason in plain words. A template rejected is a draft again
(step 2), as nothing has gone. Nothing is ever sent after a
text has stopped. A stopped text's page offers to schedule it
again to those it never reached, a new text whose filter is "not
sent this message", so fixing the words or giving it more time
doesn't text again the people it did reach.

## 3. Optional: an SMS backend

Only if WhatsApp leaves too many numbers out. An SMS provider would send
a text's words as they are to numbers not on WhatsApp, from a
real UK number so people can reply, ending with how to stop, such as
"Reply STOP to stop". Each 160-character segment is charged, and so is
each reply staff send.

Its webhook would record deliveries, failures, STOP as a stop, and other
replies, as WhatsApp's does.

## Calls

Not built here. Volunteers make calls, as local groups do now, from
numbers staff give them. A number isn't given out when it has a stop
for calls, which comes two ways:

- **The TPS**, which covers live calls only. We may call a number on it
  only if that person told PauseAI UK by name that they're happy to be
  called, and we have a record of it
  ([ICO](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-direct-marketing-using-live-calls/how-do-we-comply-with-the-rules-on-live-marketing-calls/)).
  The join form is Stichting PauseAI's, so a volunteer's number may not
  meet that. Check each number by an API, such as
  [Data Soap](https://www.datasoap.co.uk/developer/validation-api)'s,
  before it's given out and before each round of calls, as a new
  registration takes up to 28 days to count.
- **Asking not to be called**, usually on a call. The volunteer or staff
  record it, with how it was given. It's kept after erasure.

## Data protection

Record in `docs/data-protection.md`: messaging numbers that said yes;
the new opt-in sources; the SMS provider and Meta as processors of
numbers, messages and delivery receipts; read receipts, which are new
data about a person; stops kept after erasure; replies, shown to staff
and deleted on erasure; and, with calls, the TPS checker as a processor.

## Not in this plan

WhatsApp groups and Communities, attachments, messages to politicians,
and a calling tool.

## Open questions

1. Which number for WhatsApp? The giffgaff number could go on the API
   and stay in the app on Reuben's phone, through Meta's Coexistence
   feature, which unlinks WhatsApp Web until it's linked again
   ([Infobip](https://www.infobip.com/docs/whatsapp/manage-integration/coexistence)).
   Or a new number just for the API.
2. What should the checkbox say? A person writes it, and the same words
   go on Luma and our forms. It must name PauseAI UK and say messages
   and calls.
3. How does a volunteer who isn't staff record a stop for calls: by
   telling staff, or on a page of the numbers they were given?
4. Should a resume in WhatsApp's settings undo any stop, or only one
   made there, leaving a Stop button, a reply or an SMS STOP in force?
5. A person with a WhatsApp username can hide their number, and Meta's
   webhooks then give only an ID for them that's particular to us. Do we
   store that ID against the number when we send, so a later stop can be
   matched?
6. Which SMS provider, and can it take over the giffgaff number?
7. Can a text have conditional parts? Meta's docs describe a template
   body as fixed words with parameters and don't mention parts only some
   people get, so each combination would need its own template. If so,
   the writer offers fields with fallbacks for a text, not conditional
   parts. A fallback can't help a field at the start or end of the body,
   which Meta rejects
   ([overview](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview)).
8. Once the join form stops asking intent, where do we learn who wants
   to volunteer: Global's `volunteer_updates` list, our own join form,
   or something else?
9. A `march-day` text is sent on the day ("Rules"), but a text keeps
   sending for three days. Does a topic like that stop sooner, or do
   staff unschedule it if approval comes too late?
