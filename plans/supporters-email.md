# Email to supporters

The UK weekly, and smaller mailings such as one to a local group, sent
from pauseai.uk instead of CiviCRM, so each email can be personal, with
events near the reader and their MP, and the UK controls its list. This
uses the staff pages in `plans/mailings.md`, and is one pull request,
once we can read CiviCRM's unsubscribes.

## Now

- Joseph writes the weekly in CiviCRM and sends it from
  `hello@pauseai.uk` to the UK list. On 15 October it went to 1,262
  people: 99.6% were delivered, 13.5% clicked a link and 9 unsubscribed.
  Most of it, apart from the lead story, is Luma events, which the site
  could fill in (`eventMatchers` in `lib/content/local-groups.ts`).
- `contact_permission()` answers `pauseai-updates` for a member's email,
  but a yes is only "Not sure", as we can't see who unsubscribed in
  CiviCRM.
## Global's chapter contacts API

People stop the weekly in CiviCRM by unsubscribing, by stopping all
PauseAI email, or by being marked do-not-email after a complaint or
bounce. We can't move the list until we can see those.

Global refused a read key on 19 October. Since then Maxime has approved
API access, and Global has proposed a chapter contacts API
([PauseAI/pauseai-civicrm#1175](https://github.com/PauseAI/pauseai-civicrm/issues/1175)).
It waits on other work of Global's, and on the joint controller
agreement (legal-pack PR #7). If it never comes, the fallback is a
button in the CiviCRM weekly to keep getting it from pauseai.uk.

As proposed, a UK key has two actions:

- `PauseaiChapterContact.get` lists every UK chapter contact (1,536 on
  28 October): the address, `no_bulk_email`, `do_not_email` and
  `on_hold`, and whether they're on `newsletter` (our `pauseai-updates`)
  and `volunteer_updates` (unused so far). We pull it all hourly, paged
  by contact ID, and look up a new address between pulls. Only a
  complete pull removes anyone.
- `PauseaiChapterContact.updateSubscriptions` takes our stops back: an
  unsubscribe, `no_bulk_email` (for a spam complaint too, which stops
  Global's mail as well) or `do_not_email`. Each has our own ID and is
  retried until accepted. A resubscribe must come from the person, with
  the words of the box they ticked.

We may send the newsletter to an address only if a pull at most 24
hours old shows it subscribed with none of the three flags, and our own
stops allow it. With no complete pull in 24 hours, nothing sends. Our
own lists, such as `site-forms`, need their own yes, and still honour
the flags.

We'd send by Postmark, not through CiviCRM: we already email people who
aren't CRM contacts, and sharing its SES account would let our
complaints pause Global's sending. What we read from CiviCRM is used
only to stop emails.

We import 1,621 members (29 October) against the API's 1,536 (open
question 1).

## Steps

1. Import the API: the hourly pull and the lookup, into a table keyed by
   CiviCRM's contact ID and matched to members by address. The flags
   and list statuses are kept after erasure. `contact_permission()`
   answers `pauseai-updates` from them, yes or no rather than unsure,
   and any of the three flags is a no for every email topic.
2. Send our stops back: each new `opt_outs` row for the newsletter, and
   each spam complaint.
3. Decide whether leaving Luma's emails, or reporting one as spam,
   stops the weekly too.
4. An email channel on Postmark's broadcast stream
   ([streams](https://postmarkapp.com/message-streams)), separate from
   the staff emails on its transactional stream, for about $200–300 a year
   ([pricing](https://postmarkapp.com/pricing)). Postmark reviews new
   broadcast senders, so apply early. A small local mailing could go by
   Gmail instead.
5. Unsubscribing: a link and a `List-Unsubscribe` header in every email.
   The link's page offers fewer emails before none (the weekly only,
   urgent emails only, my local group only, or a three-month pause),
   shows Global's lists too, and says that stopping all bulk email stops
   Global's as well. Postmark's unsubscribe and complaint webhooks write
   to `opt_outs`.
6. The weekly's sections: the main events with how many have signed up,
   events near the reader, and their MP.
7. Before the first send, set up Google Postmaster Tools and DMARC
   reports, so we can see our spam rate; pauseai.uk's DMARC is
   `p=none`, with no reports. Google wants complaints below 0.1%
   ([sender guidelines](https://support.google.com/a/answer/81126)).

## Getting more people to say yes

- Our own join form on pauseai.uk, with a "PauseAI UK can email me" box,
  still passing new members to Global. pauseai.uk brought in 351 of the
  427 UK signups in October.
- The Luma checkbox (`plans/supporters-phone.md`) covers the weekly.
  Registering for an event isn't a yes on its own: the soft opt-in for
  charities (PECR regulation 22(3A), since 5 February 2026) is for
  registered charities, and Safe AI Alliance Ltd is a company limited by
  guarantee.
- Ask for a postcode on every Luma event, which the import already
  reads. Events near the reader need only the first half; their MP needs
  all of it.

## Data protection

Record in `docs/data-protection.md`: the chapter contacts read from
CiviCRM, kept after erasure like other stops; our stops sent to Global,
a disclosure to a joint controller once the agreement is signed; the
weekly, sent by Postmark's broadcast stream; and our join form as a new
source. The privacy policy should say that we email people who said
yes, and how to stop.

## Open questions

1. Which of the members we import aren't chapter contacts, and why? Do
   we need the API to give each contact's Airtable record ID, or is
   matching by address enough?
2. Will UK staff still send anything through CiviCRM?
