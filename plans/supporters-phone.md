# Texts and WhatsApp to supporters

Supporters' mailings sent to their phones, by text (SMS) and by WhatsApp.
Builds on `plans/mailings.md`.

Three pull requests. Consent comes first; whether texts go before
WhatsApp is still to decide:

1. **Phone consent**: opt-ins and opt-outs, shared by both channels.
2. **Texts**: not blocked, and some supporters have already said yes.
3. **WhatsApp**: once Meta has answered the policy question below.

## What's there

- `phone_number()` writes every number as we compare them, E.164 where
  it can be read as one.
- `contact_permission()` answers for the phone channel, each topic with
  the ways it allows (`TOPIC_WAYS`, `lib/contact-permissions.ts`).
  `volunteering` and `site-forms` allow calls and texts, `march-day` and
  `luma-calendar` texts. None allows WhatsApp.
- The site sends no texts or WhatsApp messages.

## Rules

- **Only to a yes for that way.** The ICO treats texts and WhatsApp
  messages as electronic mail, with no soft opt-in for political
  campaigning
  ([ICO](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/)).
  A yes to texts isn't a yes to WhatsApp.
- **A message stays within what the topic was given for.** A
  `march-day` text is about the march, on the day.
- **Replies are forwarded, not stored.** STOP, or anything like it, is
  an opt-out.

## 1. Phone consent

- WhatsApp as a way, beside call and text, and a topic or topics whose
  yes is an explicit opt-in for it.
- Opt-in boxes naming the way: on Email your MP and our other forms, a
  Luma registration question the import reads, and staff recording a
  yes given another way, with a note on how.
- Opt-outs from either channel, by reply or by the provider, written to
  `contact_unsubscribes` for the phone channel.
- A number found not to be a mobile, or not on WhatsApp, is marked so
  and skipped.

## 2. Texts

1. **A provider**, in `lib/server/outside-services/`, and its fake. A
   sender name ("PauseAI UK") can't take replies, so STOP needs a number
   or a link; a real number can take them.
2. **Free text**, no approval step. The composer counts segments of 160
   characters, as each is charged.
3. **Its webhook**: delivered and failed as `message_events`; replies,
   STOP as an opt-out and the rest forwarded to a staff inbox.

## 3. WhatsApp

### Blocker

Meta's policy bars "Political Parties, Politicians, Political
Candidates, and Political Campaigns" and "entities that offer services
related to politics" ([policy](https://whatsappbusiness.com/policy/)).
PauseAI UK is no party, but "political campaigns" isn't defined and we
lobby MPs. Ask Meta, or a Solution Provider, before building against the
API: a ban later takes the number and its history with it.

### Set up by an admin

A Meta business portfolio for Safe AI Alliance Ltd with business
verification (250 people a day unverified, 2,000 verified;
[limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits)),
a number not in the WhatsApp app with "PauseAI UK" approved as its
display name, a system user's permanent token, and a payment method.

### Steps

1. **The channel**, in `lib/server/outside-services/whatsapp.ts`, and
   its fake. Marketing templates go by the Marketing Messages API, as
   Cloud API stops sending them on 13 October 2027
   ([overview](https://developers.facebook.com/documentation/business-messaging/whatsapp/marketing-messages/overview.md)).
2. **Templates.** Staff write one on the site (name, category, `en_GB`,
   body with named parameters, a "Stop promotions" button on marketing
   ones); it's submitted to Meta and its review shows, up to 24 hours.
   Templates are read back hourly and from Meta's status webhook, so a
   paused one stops its mailings. Only an approved one can be sent
   ([templates](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview)).
3. **The webhook**, `/api/whatsapp`, checked against
   `X-Hub-Signature-256`
   ([webhooks](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint.md)):
   - sent, delivered, read and failed become `message_events`;
   - 131050 (stopped our marketing) and "Stop promotions" are opt-outs;
     131026 marks the number not on WhatsApp; 131049 (WhatsApp's
     per-person cap) fails without retry
     ([errors](https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes));
   - errors about us (template paused, payment, account restricted) stop
     the mailing and alert staff.
4. **First sends**: staff and a few volunteers, then one local group,
   watching the template's quality rating.

## Cost

Both charge per message. I don't know the UK rates. For WhatsApp, third
parties put marketing at about US$0.05–0.06 a message; check
[Meta's rate card](https://whatsappbusiness.com/products/platform-pricing/).
For texts, check the provider's own pricing.

## Data protection

A new use of phone numbers, only to a yes for that way; the new opt-in
sources; the text provider and Meta as processors of numbers, messages
and delivery receipts, and Meta of read receipts, which are new data
about a person; opt-outs kept after erasure; replies forwarded, not
stored.

## Not in this plan

A reply inbox in the site; WhatsApp groups and Communities; media and
attachments; Meta's Coexistence; texts or WhatsApp to politicians.

## Open questions

1. **Which text provider**, and does a UK sender name need registering?
2. **Does Meta count us as a political campaign?** Who asks, and through
   a Solution Provider?
3. **Who sets up Meta**, with the company's verification documents?
4. **Which number** for WhatsApp: a new one, or one we have? It leaves
   the WhatsApp app once it's on the API.
5. **The opt-in words**: one box per way, or per kind of message (events
   near you, urgent actions)?
6. **Where replies go**, and who answers them.
7. **A budget**, once the rates are known.
