# Email to supporters

The UK weekly email, and smaller mailings such as one to a local group,
will be sent from pauseai.uk instead of CiviCRM. That lets each email
be personal, with events near the reader and their MP, and gives the UK
control of its list. This builds on `plans/mailings.md`, whose phase 3
makes the staff pages for messages to supporters, and is one pull
request, which needs access to CiviCRM first.

## How it works now

- Joseph writes the weekly in CiviCRM and sends it from
  `hello@pauseai.uk` to the UK list. On 15 October it went to 1,262
  people: 99.6% were delivered, 13.5% clicked a link and 9
  unsubscribed. Apart from Joseph's lead story, most of it is Luma
  events, which the site could fill in (`eventMatchers` in
  `lib/content/local-groups.ts`).
- `contact_permission()` already answers `pauseai-updates` for email.
  A member's yes is "unsure", because we can't see who unsubscribed in
  CiviCRM. A yes from the box on our own forms (`site-forms`) is sure.
- Following the Luma calendar is a yes for `luma-calendar` only, which
  doesn't cover the weekly. We do see when people leave Luma's emails:
  the webhook tells us about an unsubscribe at once, and the daily pass
  over Luma's contacts finds removals, blocks, spam reports and people
  who follow again.

## CiviCRM

People stop the weekly in CiviCRM by using its unsubscribe link, by
choosing to stop all PauseAI email, or by being marked do-not-email
after a complaint or bounce. Airtable's "Keep me informed" is never
updated after someone signs up. We can't move the list until we can see
those unsubscribes.

Global refused a read key and an opt-out feed on 19 October. Since
then, Maxime has approved API access to CiviCRM, and Jakub is going to
set it up. There's no date yet. If it never happens, the fallback is to
put a button in the CiviCRM weekly for people to keep getting it from
pauseai.uk.

There's no data agreement between PauseAI UK and Stichting PauseAI, so
both need to follow good data protection practice. Someone who joined
PauseAI UK through pauseai.info meant us to have their details, so we
use them, as the members import already does. Anything we read from
CiviCRM is used only to stop emails to people who opted out. Global's
draft [legal pack](https://github.com/PauseAI/legal-pack) hasn't been
signed by the UK. Germany, France and Spain already run their own
lists, and we will keep passing new signups to Global.

## Steps

1. Read CiviCRM. Explore the API first to see what it holds. Two parts
   seem to match what we have:
   - its bulk opt-out, which stops all bulk email, like our blocked
     addresses;
   - membership of the UK chapter's mailing list, including who has
     left it, which matches the weekly.

   Import what fits, and keep it after erasure, as with other opt-outs.
   Then decide how the topics fit together: whether `pauseai-updates`
   and the weekly are the same topic, and whether unsubscribing from
   Luma, or reporting a Luma email as spam, should stop the weekly too.
2. Add a "UK weekly" topic to `contact_permission()`.
3. Add an email channel for supporters, using Postmark's broadcast
   stream ([streams](https://postmarkapp.com/message-streams)), kept
   separate from letters to MPs. It costs about $200–300 a year
   ([pricing](https://postmarkapp.com/pricing)). Postmark reviews new
   broadcast senders, so apply early. A small local mailing could be
   sent by Gmail instead, picked under "Sent from"
   (`plans/politician-email.md`).
4. Add unsubscribing. Every email has an unsubscribe link and a
   `List-Unsubscribe` header. The link goes to a page that offers fewer
   emails before none: the weekly only, urgent emails only, my local
   group only, or a three-month pause. Postmark's unsubscribe and
   complaint webhooks write to `contact_unsubscribes`.
5. Build the weekly's sections: the main events with how many have
   signed up, events near the reader, and their MP.
6. Before the first send, set up Google Postmaster Tools and DMARC
   reports so we can see our spam rate. Google wants complaints below
   0.1% ([sender guidelines](https://support.google.com/a/answer/81126)).
   pauseai.uk's DMARC policy is `p=none`, with no reports.

## Getting more people to say yes

- Replace pauseai.info's join form on pauseai.uk with our own, with a
  "PauseAI UK can email me" box, and keep passing new members to
  Global. pauseai.uk brought in 351 of the 427 UK signups in October.
- If we add the Luma checkbox (`plans/supporters-phone.md`), it covers
  the weekly. Registering for an event isn't a yes on its own. The new
  soft opt-in for charities (PECR regulation 22(3A), in force since 5
  February 2026) only applies to registered charities, and Safe AI
  Alliance Ltd is a company limited by guarantee.
- Ask "Your postcode (the first half is fine)" on every Luma event. The
  import already reads it. Events near the reader need a town, and
  their MP needs a full postcode.

## Data protection

Record in `docs/data-protection.md`: unsubscribes read from CiviCRM,
kept after erasure like other opt-outs; the weekly as a new use, with
Postmark's broadcast stream; and our join form as a new source. The
privacy policy should say that we email people who said yes, and how to
stop.
