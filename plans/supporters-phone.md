# Texts and WhatsApp to supporters

Supporters' mailings by text and WhatsApp. Builds on
`plans/mailings.md`. Three pull requests:

1. **Phone groundwork**: consent, opt-outs and replies, shared by both.
2. **Texts**, not blocked.
3. **WhatsApp**, once Meta answers on political campaigns.

Whether texts come before WhatsApp is waiting on Joseph.

## What's there

- `phone_number()` writes numbers as we compare them, E.164 where it
  can.
- `contact_permission()` answers for phones, each topic with the ways it
  allows (`TOPIC_WAYS` in `lib/contact-permissions.ts`): `volunteering`
  and `site-forms` calls and texts, `march-day` and `luma-calendar`
  texts. None allows WhatsApp.
- The site sends no texts or WhatsApp. A giffgaff number has the
  WhatsApp Business app on Reuben's phone, but its broadcast lists only
  reach people who've saved the number, hence the API.

## Rules

- **Only to a yes for that way.** The ICO treats texts and WhatsApp as
  electronic mail, with no soft opt-in for political campaigning
  ([ICO](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/)).
  A yes to texts isn't a yes to WhatsApp.
- **Within what it was given for.** A `march-day` text is about the
  march, on the day.
- **Replies are on the site.** Shown on the supporter's page and
  answered from there, so nobody needs the phone. STOP, or anything
  like it, is an opt-out.

## 1. Phone groundwork

### The Luma checkbox

Luma's phone field doesn't say what the number is for; that's up to the
host. An event makes it off, optional or required, and with a number in
someone's Luma profile the last two look the same. PauseCon required a
number; the March made it optional and about one in six gave one. So a
Luma number is a yes only to what the event said, usually its reminders.

The proposal, to decide with Joseph: a checkbox on every event's
registration that makes someone as good as a member, a yes to the
weekly, texts about events, and later calls from volunteers. It only
asks new registrations, so existing Luma people get a calendar
newsletter linking to a yes page on pauseai.uk. We measure how many
tick it per event, and narrow it (the weekly and event texts first) if
too few do.

### Steps

1. **WhatsApp as a way**, beside call and text, with a topic whose yes
   is an explicit opt-in for it.
2. **Opt-ins**: the box on Email your MP and our other forms; the Luma
   checkbox, read by the import as the postcode question is; staff
   recording a yes given another way, with a note on how.
3. **Opt-outs** from either channel, by reply or from the provider,
   written to `contact_unsubscribes`.
4. **Bad numbers**: one found not to be a mobile, or not on WhatsApp,
   is marked and skipped.
5. **Replies**: stored with the message they answer, shown on the
   supporter's page, with a reply box for anyone with the `supporters`
   permission. Each answer records who sent it.

## 2. Texts

1. **A provider** in `lib/server/outside-services/`, and its fake,
   sending from a real UK number, as a sender name ("PauseAI UK") can't
   take replies.
2. **Free text**, with no approval step. The composer counts 160
   character segments, and the mailing's cost is per segment.
3. **Its webhook**: delivered and failed as `message_events`, STOP as an
   opt-out, other replies to the supporter's page.
4. **Answering** has no time limit; each answer is charged as a text.

## 3. WhatsApp

### Before building

Meta's policy bars "Political Parties, Politicians, Political
Candidates, and Political Campaigns" and "entities that offer services
related to politics" ([policy](https://whatsappbusiness.com/policy/)).
We're no party, but "political campaigns" isn't defined and we lobby
MPs. Ask Meta, or a Solution Provider, first: a ban later takes the
number and its history.

Then Francis sets up, with Joseph as a second admin:

- a Meta business portfolio for Safe AI Alliance Ltd, verified with the
  certificate of incorporation from Companies House and a document from
  Joseph with the company's name and address, such as a bank statement.
  Unverified, it can message 250 people a day; verified, 2,000
  ([limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits));
- the number, with "PauseAI UK" approved as its display name;
- a system user's permanent token, and a payment method.

### Steps

1. **The channel** in `lib/server/outside-services/whatsapp.ts`, and
   its fake. Marketing templates go by the Marketing Messages API, as
   Cloud API stops sending them on 13 October 2027
   ([overview](https://developers.facebook.com/documentation/business-messaging/whatsapp/marketing-messages/overview.md)).
   Meta charges per delivered message, by category
   ([rate card](https://whatsappbusiness.com/products/platform-pricing/)).
2. **Templates**, written on the site (name, category, `en_GB`, body
   with named parameters, a "Stop promotions" button on marketing ones)
   and submitted to Meta, whose review takes up to 24 hours. They're
   read back hourly and from Meta's status webhook, so a paused one
   stops its mailings. Only approved ones send
   ([templates](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview)).
3. **The webhook**, `/api/whatsapp`, checked against
   `X-Hub-Signature-256`
   ([webhooks](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint.md)):
   - sent, delivered, read and failed become `message_events`;
   - 131050 (stopped our marketing) and "Stop promotions" are opt-outs;
     131026 marks a number not on WhatsApp; 131049 (WhatsApp's
     per-person cap) fails without retry
     ([errors](https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes));
   - errors about us (template paused, payment, account restricted)
     stop the mailing and alert staff;
   - replies go to the supporter's page.
4. **Answering**: free text, free of charge, within 24 hours of the
   person's last message
   ([pricing](https://developers.facebook.com/docs/whatsapp/pricing));
   after that, an approved template.
5. **First sends**: staff and a few volunteers, then one local group,
   watching the template's quality rating.

## Data protection

A new use of phone numbers, only to a yes for that way; the new opt-in
sources; the text provider and Meta as processors of numbers, messages
and delivery receipts; read receipts from Meta, new data about a
person; opt-outs kept after erasure; replies stored and shown to staff,
deleted on erasure.

## Not in this plan

WhatsApp groups and Communities; media and attachments; texts or
WhatsApp to politicians.

## Open questions

1. **Which text provider**, and can it take the giffgaff number by
   porting, or does it need its own?
2. **Does Meta count us as a political campaign?** Asked directly, or
   through a Solution Provider?
3. **One number for both?** The giffgaff number could be WhatsApp's on
   the API, and stay in the Business app through Meta's Coexistence,
   which unlinks WhatsApp Web until it's linked again
   ([Infobip](https://www.infobip.com/docs/whatsapp/manage-integration/coexistence)).
   It could be the texts' number too, if the provider takes it.
4. **The checkbox's words**, the same on Luma and our forms, written by
   a person. They name PauseAI UK and each way, as Meta's opt-in needs;
   WhatsApp may need its own box.
