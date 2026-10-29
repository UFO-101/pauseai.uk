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
then, Maxime has approved API access, and Global has proposed a chapter
contacts API for the UK
([PauseAI/pauseai-civicrm#1175](https://github.com/PauseAI/pauseai-civicrm/issues/1175)).
It waits on other work of Global's first, and on the joint controller
agreement (legal-pack PR #7). If it never happens, the fallback is to
put a button in the CiviCRM weekly for people to keep getting it from
pauseai.uk.

### The chapter contacts API, as proposed

An API key for the UK with two actions:

- `PauseaiChapterContact.get` lists every UK chapter contact (1,536 on
  28 October): the address CiviMail would use, `no_bulk_email`,
  `do_not_email` and `on_hold`, and each UK list as subscribed,
  unsubscribed or not on it. The lists are `newsletter`, which is our
  `pauseai-updates`, from the "Keep me informed" tick, and
  `volunteer_updates`, unused so far. We pull it all hourly, paged by
  contact ID, and look up a new address by POST between pulls. Only a
  complete pull removes anyone.
- `PauseaiChapterContact.updateSubscriptions` takes our opt-outs back:
  an unsubscribe from a list, `no_bulk_email` (for a spam complaint
  too, and it stops Global's mail as well) or `do_not_email`. A
  resubscribe must come from the person, with the words of the box
  they ticked. Each event has our own ID, such as the `opt_outs` row's,
  and we retry it until it's accepted.

We may send the newsletter to an address only if our latest data, at
most 24 hours old, shows it as a contact's address, subscribed, with
none of the three flags set, and our own opt-outs allow it. With no
complete pull in 24 hours, nothing sends. Our own lists, such as
`site-forms`, need their own yes on pauseai.uk, and still honour the
three flags for anyone the API returns.

We'd send alongside CiviCRM, by Postmark, not through it: we already
send to people who aren't CRM contacts (Luma, our forms), and sharing
its SES account would let our complaints pause Global's sending.

Our import takes about 85 more members than the API's count: 1,621 on
29 October, being those who shared their details (1,091) and those who
joined before July 2026 and were never asked (530). We need to know
which of ours aren't chapter contacts, and why. The Airtable record ID
in the API would let us match the two exactly.

There's no data agreement between PauseAI UK and Stichting PauseAI, so
both need to follow good data protection practice. Someone who joined
PauseAI UK through pauseai.info meant us to have their details, so we
use them, as the members import already does. Anything we read from
CiviCRM is used only to stop emails to people who opted out. Global's
draft [legal pack](https://github.com/PauseAI/legal-pack) hasn't been
signed by the UK. Germany, France and Spain already run their own
lists, and we will keep passing new signups to Global.

## Steps

1. Read the chapter contacts API, as an import job: the hourly pull
   and the lookup, into a table of contacts keyed by CiviCRM's contact
   ID, matched to members by Airtable record ID if the API gives it,
   else by address. The flags and list statuses are kept after
   erasure, as other opt-outs are. `contact_permission()` answers
   `pauseai-updates` from them, yes or no rather than unsure, and
   treats any of the three flags as a no for every email topic.
2. Send our opt-outs back: each new `opt_outs` row for the newsletter,
   and each spam complaint, as an event, marked when accepted and
   retried until it is.
3. Decide how the topics fit together: whether unsubscribing from Luma,
   or reporting a Luma email as spam, should stop the weekly too.
4. Add an email channel for supporters, using Postmark's broadcast
   stream ([streams](https://postmarkapp.com/message-streams)), kept
   separate from letters to MPs. It costs about $200–300 a year
   ([pricing](https://postmarkapp.com/pricing)). Postmark reviews new
   broadcast senders, so apply early. A small local mailing could be
   sent by Gmail instead, picked under "Sent from"
   (`plans/politician-email.md`).
5. Add unsubscribing. Every email has an unsubscribe link and a
   `List-Unsubscribe` header. The link goes to a page that offers fewer
   emails before none: the weekly only, urgent emails only, my local
   group only, or a three-month pause. It shows Global's lists too, so
   people manage everything in one place, and says that stopping all
   bulk email stops Global's as well. Postmark's unsubscribe and
   complaint webhooks write to `opt_outs`, which step 2 sends on.
6. Build the weekly's sections: the main events with how many have
   signed up, events near the reader, and their MP.
7. Before the first send, set up Google Postmaster Tools and DMARC
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

Record in `docs/data-protection.md`: the chapter contacts read from
CiviCRM (address, flags and list statuses), kept after erasure like
other opt-outs; our opt-outs sent to Global, a disclosure to a joint
controller under the agreement once it's signed; the weekly as a new use, with
Postmark's broadcast stream; and our join form as a new source. The
privacy policy should say that we email people who said yes, and how to
stop.

## Open questions

1. Which of the members we import aren't chapter contacts, and why?
   Will the API give each contact's Airtable record ID, so we can
   match them exactly?
2. Will UK staff still send anything through CiviCRM?
