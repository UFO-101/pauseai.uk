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
API access, and Global has specified a chapter contacts API
([PauseAI/pauseai-civicrm#1175](https://github.com/PauseAI/pauseai-civicrm/issues/1175)),
which Francis has agreed fits. It's marked blocked in Global's infra
project: it waits on other work of Global's, and on the joint
controller agreement (legal-pack PR #7). Who updates the legitimate
interests assessment is also open. If the API never comes, the fallback
is a button in the CiviCRM weekly to keep getting it from pauseai.uk.

A UK key, on a dedicated API account (a service contact owned by a
named developer who has signed the AUA), reaches two actions and
nothing else. Every call is logged on Global's side: account, action
and outcome, never the addresses.

### Who it returns

The contacts CiviCRM assigns to the UK chapter: 1,536 on 28 October,
growing 20 to 30 a day. Each row is an address, `on_hold`,
`no_bulk_email`, `do_not_email`, the contact's `airtable_id` (the
Members record ID our `members` and `members_erased` tables are keyed
by, or null; after a merge, the surviving record's) and each UK list
as `subscribed`, `unsubscribed` or `not_on_list`. No name, phone or
address in v1.

Anyone whose UK relationship has ended, such as by saying no to
sharing with the chapter, or who was deleted, is simply not returned.
Absence is the signal: Global won't say "left UK", as that would tell
us about someone who said no. So being in `members` isn't enough to
mail someone, and once someone stops being returned we remove them
from `members` and have the Airtable import skip them, after a delay
long enough to catch a bug on Global's side that returns too few. That
covers only the people we get from Global; people from Luma or an MP
letter are our own records.

An address shared by several contacts (41 on 28 October, unmerged
duplicates) gets a row for each UK contact, with the same values: the
flags and removals are combined across every contact with the address,
in the UK chapter or not, so a stop on any one blocks the address, and
only a current UK contact can make it subscribed. Addresses are
compared trimmed and lowercased; plus-addressing and provider aliases
are different addresses.

The lists, as people see them:

- `newsletter`, "PauseAI UK Newsletter": our `pauseai-updates`, from the
  "Keep me informed" tick. The one to replace.
- `volunteer_updates`, "PauseAI UK Volunteer Updates": people who said
  at signup they want to volunteer or lead. Nothing has been sent to
  it. The new join form won't ask about intent, so it may be filled
  another way or removed (open question 3).

Global's own lists stay sent from CiviCRM: "PauseAI Newsletter" (no
fixed schedule, lately a weekly follow-up to new signups), "Critical
Alerts" (urgent calls to action such as the Warning Shot emails, which
members join by default even without "Keep me informed") and "Local
Invitations" (from Global to people in an area, mostly to start or join
a group). They can be added to the API if we build a preferences page
that shows them. The set of lists may change.

### Reading: `PauseaiChapterContact.get`

A full pull is paged by contact ID, 500 rows at a time, passing the
last `contact_id` as `after_contact_id`; it's complete when a page is
short. We pull hourly, and only a complete pull removes anyone. Between
pulls, an address not in the last pull (someone who just joined) is
looked up by POST, so it stays out of URL logs.

We match by email first, falling back to `contact_id` when the address
isn't found: an email change keeps the contact ID, and a merge of
duplicates ends one contact ID and keeps the address. So we store the
contact ID alongside the Airtable ID, and use `airtable_id` for the
first match and for checking against `members_erased`. We send only to
the returned address, never an older one we hold.

### Writing: `PauseaiChapterContact.updateSubscriptions`

Up to 100 events a call, applied in order. Each carries our own unique
`event_id` (the `opt_outs` row ID, not a Postmark message ID, which an
unsubscribe and a complaint can share), the address, when it happened
and its source. Resending an ID changes nothing and returns the first
result, so we retry every event until it has a result, and suppress
locally the moment we get a stop. Changes apply by address, to every
contact with it, in the UK chapter or not:

- `unsubscribe` from a list, `no_bulk_email` (our spam complaints too,
  which stops Global's mail as well) and `do_not_email` ("never email
  me") are never refused. An opt-out may name the `contact_id` from the
  last pull, so it still applies if the address changed in CiviCRM
  since.
- `resubscribe` to a list and `allow_bulk_email` must come from the
  person, ticking a box on a preferences page, never staff or a bulk
  job, and carry the box's wording, which must name who will contact
  them (JCA 2.6(e)); Global logs it for audit. They're refused when a
  later or equal stop exists on either side (`newer_unsubscribe`),
  "Do not email" is set (`opted_out_everywhere`), the person doesn't fit
  the list (`not_on_list`) or no current UK contact has the address
  (`not_in_uk`). `allow_bulk_email` re-enables Global's mail too, which
  our page must say. The API never clears "Do not email".

Each event comes back `accepted` (applied, already so, or nothing to
do; it doesn't say whether the address matched anyone), `refused` with
a reason, or `invalid` with an error.

Known limits Global accepts for v1: once an address stops being
returned the API says nothing more about it, so we keep the blocks
we've seen for our own lists; a stop for an address with no contact
changes nothing in CiviCRM and isn't applied if they join later; and
an opt-in delayed past a repeated stop could clear it.

Not in v1: bounces back to CiviCRM (Postmark suppresses its own),
creating contacts, or replacing our Airtable import.

### Sending rule

We may send a list's mail to an address only if our latest data for it
(a complete pull, or a later lookup, at most 24 hours old) returns the
address, shows that list subscribed with all three flags false, and our
own stops allow it. A change in CiviCRM reaches us with the next pull,
normally within the hour. With no complete pull in 24 hours, nothing
sends. Each mailing goes once per address, however many rows or members
share it. Our own lists, such as `site-forms`, need their own yes on
pauseai.uk, and still honour the flags for any address the API returns;
an address it doesn't return follows our own records.

We send by Postmark, not through CiviCRM: we already email people who
aren't CRM contacts, and sharing its SES account would let our
complaints pause Global's sending. Anthony suggested sending through
the CRM instead, which would enforce stops at send time with no sync
lag; that's a separate discussion, along with what role each system
plays longer term. What we read from CiviCRM is used only to stop
emails.

Global's CRM has "Do not phone" and "Do not SMS" flags, but Global
doesn't call or text; phone stops could extend this API later
(`plans/supporters-phone.md`).

We import 1,621 members (29 October) against the API's 1,536 (open
question 1).

## Steps

1. Import the API: the hourly pull and the lookup, into a table keyed by
   CiviCRM's contact ID, holding the Airtable ID too, and matched to
   members by address with the contact ID as fallback. The flags and
   list statuses are kept after erasure. `contact_permission()` answers
   `pauseai-updates` from them, yes or no rather than unsure, and any
   of the three flags is a no for every email topic. A member no longer
   returned is removed from `members` after a delay, and the import
   skips them.
2. Send our stops back: each new `opt_outs` row for the newsletter, and
   each spam complaint as `no_bulk_email`, retried until each has a
   result.
3. Decide whether leaving Luma's emails, or reporting one as spam,
   stops the weekly too.
4. An email channel on Postmark's broadcast stream
   ([streams](https://postmarkapp.com/message-streams)), separate from
   the staff emails on its transactional stream, for about $200–300 a year
   ([pricing](https://postmarkapp.com/pricing)). It sends from
   `hello@pauseai.uk`, which needs that address as a sender signature in
   Postmark; the site's own emails go from `noreply@`. Postmark reviews
   new broadcast senders, so apply early. A small local message could go by
   Gmail instead.
5. Opt-outs, as below: the link and header in every email, the page
   they lead to, the webhooks, and staff recording one by hand.
6. The weekly's sections: the main events with how many have signed up,
   events near the reader, and their MP.
7. Before the first send, set up Google Postmaster Tools and DMARC
   reports, so we can see our spam rate; pauseai.uk's DMARC is
   `p=none`, with no reports. Google wants complaints below 0.1%
   ([sender guidelines](https://support.google.com/a/answer/81126)).

## Opt-outs

PECR wants a simple way to stop in every email. Google wants a visible
link and one-click headers from anyone sending 5,000 a day, which we do
from the start, and spam rates below 0.1%, never reaching 0.3%
([sender guidelines](https://support.google.com/a/answer/81126)). As
for texts (`plans/supporters-phone.md`, "Opt-outs"), a stop reaches us
every way a person might make it, and each is honoured at once:

- From the unsubscribe link in every email. Its page offers fewer
  emails before none (the weekly only, urgent emails only, my local
  group only, or a three-month pause), shows Global's lists too, and
  says that stopping all bulk email stops Global's as well.
- From the `List-Unsubscribe` and `List-Unsubscribe-Post` headers in
  every email, which mail apps show as their own Unsubscribe button and
  honour with one POST, no page.
- From a spam complaint, by Postmark's webhook, which stops all bulk
  email from us and is sent to Global as `no_bulk_email`.
- As a reply saying unsubscribe, or anything less clear such as "please
  stop", shown to staff on the message's page with a button to record
  it as a stop.
- Any other way, such as a word at an event. Staff record it, with how
  it was given.
- From CiviCRM, by the hourly pull: an unsubscribe there, or any of the
  three flags.

Each stop is a row in `opt_outs` with its source (`link`,
`list-unsubscribe`, `postmark-complaint`, `reply`, `staff`, `civicrm`),
and what it stops: one topic, or every email. From then on
`contact_permission()` says no for it, `contact_unsubscribes` lists it
on the supporter's page, and every message is checked just before it's
sent, so one scheduled before the stop is skipped with the reason
(`plans/mailings.md`). It's kept after erasure. A resubscribe must come
from the person, with the words of the box they ticked; nothing a staff
member records can reopen one.

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

1. Which of the members we import aren't chapter contacts, and why?
   Some said no to chapter sharing or were deleted; is that all of the
   gap?
2. Will UK staff still send anything through CiviCRM? Global asks the
   same.
3. Do we plan volunteer-only mailings? If not, Global can drop
   `volunteer_updates`. If so, how do people join it once the join form
   stops asking intent (`plans/supporters-phone.md`, open question 7)?
4. Will we send lists of our own beyond the shared ones? If so, people
   should manage everything in one place: our preferences page would
   show Global's lists too, added to the API, and CiviCRM's page would
   link UK contacts to ours. The alternative, tracking our lists in
   CiviCRM, means creating our people as CRM contacts.
5. Is `hello@pauseai.uk` a mailbox the site can read, as it reads
   connected Gmails for replies from politicians (`read-gmail`)? If not,
   replies need another address or Postmark's inbound webhook.
