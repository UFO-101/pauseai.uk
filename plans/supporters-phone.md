# Texts and WhatsApp to supporters

Mailings to supporters by text message and WhatsApp. This builds on
`plans/mailings.md` and is three pull requests:

1. The groundwork both channels need: consent, opt-outs and replies.
2. Texts, which nothing outside blocks.
3. WhatsApp, after Meta says whether its policy allows us.

Joseph hasn't yet said whether texts should come before WhatsApp.

## What we have now

- `phone_number()` writes each number in the form we compare them in,
  E.164 where possible.
- `contact_permission()` answers for phone numbers. Each topic lists
  the ways it allows (`TOPIC_WAYS` in `lib/contact-permissions.ts`):
  `volunteering` and `site-forms` allow calls and texts, and
  `march-day` and `luma-calendar` allow texts. None allows WhatsApp.
- The site doesn't send texts or WhatsApp messages. We have a giffgaff
  number with the WhatsApp Business app on Reuben's phone, but the app's
  broadcast lists only reach people who have saved our number. That's
  why this plan uses the API.

## Rules

- We only message someone in a way they said yes to. The ICO treats
  texts and WhatsApp messages as electronic mail, and the soft opt-in
  doesn't cover political campaigning
  ([ICO](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/)).
  A yes to texts isn't a yes to WhatsApp.
- A message stays within what the person agreed to. For example, a
  `march-day` text is about the march, sent on the day.
- Replies are shown on the supporter's page and answered from the site,
  so nobody needs the phone itself. A reply of STOP, or anything like
  it, is an opt-out.

## 1. Groundwork

### The Luma checkbox

Luma's phone field doesn't tell people what their number will be used
for; that's left to the host. Each event can make the field off,
optional or required. If someone's Luma profile already has a number,
optional and required look the same to them. PauseCon required a number.
The march made it optional, and about one in six people gave one. So a
number from Luma only allows what that event said it was for, which is
usually its reminders.

The proposal, to be decided with Joseph, is a checkbox on every event's
registration form. Ticking it would give the same permission as joining
as a member: the weekly email, texts about events, and later calls from
volunteers. It only reaches people as they register, so we would ask
existing Luma contacts with a calendar newsletter linking to a page on
pauseai.uk where they can say yes. We will measure what share tick it
on each event. If it's low, we will ask for less, starting with the
weekly and event texts.

### Steps

1. Add WhatsApp as a way to contact someone, alongside calls and texts,
   with a topic that only an explicit WhatsApp opt-in says yes to.
2. Collect opt-ins: the box on Email your MP and our other forms; the
   Luma checkbox, which the import reads as it reads the postcode
   question; and a way for staff to record a yes given in person or
   elsewhere, with a note on how it was given.
3. Record opt-outs from either channel, whether from a reply or from the
   provider, in `contact_unsubscribes`.
4. Mark a number that turns out not to be a mobile, or not to be on
   WhatsApp, and skip it in future.
5. Store each reply with the message it answers, and show it on the
   supporter's page with a reply box. Anyone with the `supporters`
   permission can reply, and each reply records who sent it.

## 2. Texts

1. Add a text provider in `lib/server/outside-services/`, with a fake
   version for tests. Texts are sent from a real UK number, because
   people can't reply to a sender name such as "PauseAI UK".
2. Texts are free text, with no approval step. The composer counts
   160-character segments, because each one is charged.
3. The provider's webhook records deliveries and failures in
   `message_events`, treats STOP as an opt-out, and stores other
   replies for the supporter's page.
4. Staff can reply to a text at any time. Each reply is charged as a
   text.

## 3. WhatsApp

### Before building

Meta's policy doesn't allow "Political Parties, Politicians, Political
Candidates, and Political Campaigns", or "entities that offer services
related to politics" ([policy](https://whatsappbusiness.com/policy/)).
PauseAI UK isn't a party, but the policy doesn't define "political
campaigns", and we lobby MPs. We should ask Meta, or a Solution
Provider, before building anything, because a ban later would lose the
number and its message history.

Then Francis sets up the account, with Joseph as a second admin:

- A Meta business portfolio for Safe AI Alliance Ltd. To verify it, Meta
  needs the certificate of incorporation, which is on Companies House,
  and a document showing the company's name and address, such as a bank
  statement, which Joseph can provide. An unverified account can
  message 250 people a day, and a verified one 2,000
  ([limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits)).
- The phone number, with "PauseAI UK" approved as its display name.
- A system user with a permanent access token, and a payment method.

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
   "Stop promotions" button on marketing templates. The site submits it
   to Meta, whose review can take up to 24 hours. The site reads
   templates back hourly and from Meta's status webhook, so a template
   Meta pauses stops the mailings that use it. Only approved templates
   can be sent
   ([templates](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview)).
3. The webhook at `/api/whatsapp` checks each request's
   `X-Hub-Signature-256`
   ([webhooks](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint.md)).
   - Sent, delivered, read and failed statuses are recorded in
     `message_events`.
   - Error 131050 (the person stopped our marketing) and the "Stop
     promotions" button are opt-outs. Error 131026 means the number
     isn't on WhatsApp. Error 131049 (WhatsApp's limit per person) is a
     failure that isn't retried
     ([errors](https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes)).
   - Errors about our account, such as a paused template, a payment
     problem or a restriction, stop the mailing and alert staff.
   - Replies are stored for the supporter's page.
4. Within 24 hours of the person's last message, staff can reply with
   free text, at no charge
   ([pricing](https://developers.facebook.com/docs/whatsapp/pricing)).
   After that, a reply must use an approved template.
5. Send first to staff and a few volunteers, then to one local group,
   and watch the template's quality rating before sending more widely.

## Data protection

Record in `docs/data-protection.md`: a new use of phone numbers, only
for people who said yes to that way; the new opt-in sources; the text
provider and Meta as processors of numbers, messages and delivery
receipts; read receipts from Meta, which are new data about a person;
opt-outs kept after erasure; and replies, stored and shown to staff,
and deleted on erasure.

## Not in this plan

WhatsApp groups and Communities, pictures and attachments, and texts or
WhatsApp messages to politicians.

## Open questions

1. Which text provider should we use? Can it take over the giffgaff
   number, or does it need a number of its own?
2. Does Meta count PauseAI UK as a political campaign? Should we ask
   Meta directly, or through a Solution Provider?
3. Should one number be used for both? The giffgaff number could be our
   WhatsApp number on the API and stay in the WhatsApp Business app
   through Meta's Coexistence feature. Connecting it unlinks WhatsApp
   Web, which can then be linked again
   ([Infobip](https://www.infobip.com/docs/whatsapp/manage-integration/coexistence)).
   It could also be our texting number, if the text provider can take
   it over.
4. What should the checkbox say? The same words should be used on Luma
   and our own forms, and a person needs to write them. They need to
   name PauseAI UK and each way we'd contact someone, as Meta requires.
   WhatsApp may need a box of its own.
