# WhatsApp to supporters

Supporters' mailings sent on WhatsApp, through Meta's WhatsApp Business
Platform. Builds on `plans/mailings.md`.

Two pull requests: **opt-ins**, which needs nothing from Meta, then
**WhatsApp**, once Meta is set up and the first blocker is answered.

## Blockers

1. **WhatsApp may not allow us.** Its policy bars "Political Parties,
   Politicians, Political Candidates, and Political Campaigns" and
   "entities that offer services related to politics"
   ([policy](https://whatsappbusiness.com/policy/)). PauseAI UK is no
   party, but "political campaigns" isn't defined and we lobby MPs. Ask
   Meta, or a Solution Provider, before building against the API: a ban
   later takes the number and its history with it.
2. **Nobody has said yes to WhatsApp.** Meta needs an opt-in naming us
   ([opt-in](https://developers.facebook.com/documentation/business-messaging/whatsapp/getting-opt-in.md)),
   and the ICO treats such messages as electronic mail, with no soft
   opt-in for political campaigning
   ([ICO](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/electronic-and-telephone-marketing/electronic-mail-marketing/)).
   The phone topics we have (`luma-calendar`, `volunteering`,
   `site-forms`, `march-day`) are for calls and texts, not WhatsApp. So
   the list starts empty.

## 1. Opt-ins

- WhatsApp as a way of reaching a number, beside call and text, with a
  topic whose yes is only an explicit WhatsApp opt-in, in
  `contact_permission()`.
- Opt-in boxes: on Email your MP and our other forms, a Luma
  registration question the import reads, and staff recording a yes
  given another way, with a note on how.

## 2. WhatsApp

Set up by an admin first: a Meta business portfolio for Safe AI Alliance
Ltd with business verification (250 people a day unverified, 2,000
verified;
[limits](https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits)),
a number not in the WhatsApp app with "PauseAI UK" approved as its
display name, a system user's permanent token, and a payment method.

1. **The WhatsApp channel**, in `lib/server/outside-services/whatsapp.ts`.
   Marketing templates go by the Marketing Messages API, as Cloud API
   stops sending them on 13 October 2027
   ([overview](https://developers.facebook.com/documentation/business-messaging/whatsapp/marketing-messages/overview.md)).
2. **Templates.** Staff write one on the site (name, category, `en_GB`,
   body with named parameters, a "Stop promotions" button on marketing
   ones), it's submitted to Meta, and its review shows, up to 24 hours.
   Templates are read back hourly and from Meta's status webhook, so a
   paused one stops its mailings. Only an approved one can be sent
   ([templates](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview)).
3. **The webhook**, `/api/whatsapp`, checked against
   `X-Hub-Signature-256`
   ([webhooks](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint.md)):
   - statuses (sent, delivered, read, failed) become `message_events`;
   - 131050 (stopped our marketing), "Stop promotions", and a reply of
     stop or unsubscribe are opt-outs; 131026 marks the number unusable;
     131049 (WhatsApp's per-person cap) fails without retry
     ([errors](https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes));
   - errors about us (template paused, payment, account restricted) stop
     the mailing and alert staff;
   - any other reply is forwarded to a staff inbox and logged, not
     stored.
4. **The daily cap.** The send job stops at the portfolio's limit and
   carries the rest to the next day, saying so on the mailing's page.
5. **First sends**: staff and a few volunteers, then one local group,
   watching the template's quality rating before anything bigger.

### Cost

Meta charges per delivered message by category and country
([pricing](https://developers.facebook.com/docs/whatsapp/pricing)). I
couldn't read the UK marketing rate from Meta's rate card; third parties
put it at about US$0.05–0.06 a message. Check it on
[Meta's rate card](https://whatsappbusiness.com/products/platform-pricing/).

## Data protection

A new use of phone numbers, only to a yes; the new opt-in sources; Meta
as a processor of numbers, messages, and delivery and read receipts (a
read receipt is new data about a person); opt-outs kept after erasure;
replies forwarded, not stored.

## Not in this plan

Free text messages and a reply inbox; WhatsApp groups and Communities;
media and attachments; Meta's Coexistence; WhatsApp to politicians.

## Open questions

1. **Does Meta count us as a political campaign?** Who asks, and through
   a Solution Provider?
2. **Who sets up Meta**, with the company's verification documents?
3. **Which number**: a new one, or one we have? It leaves the WhatsApp
   app once it's on the API.
4. **The opt-in words**: one box for all WhatsApp messages, or one per
   kind (events near you, urgent actions)?
5. **Where replies go**, and who answers them.
6. **A budget**, once the UK rate is known.
