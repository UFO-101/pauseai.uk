# Email to supporters

The UK weekly, and smaller mailings such as a local group's, sent from
pauseai.uk instead of CiviCRM, so it can be personal (events near you,
your MP) and the UK controls the list.

Builds on `plans/mailings.md`. One pull request, once the blocker below
is settled.

## Today

Joseph writes the weekly in CiviCRM and sends it from `hello@pauseai.uk`
to the UK list: on 15 Oct, 1,262 recipients, 99.6% delivered, 13.5%
clicked, 9 unsubscribed. Besides his lead story it's mostly Luma events,
which we can generate (`eventMatchers` in `lib/content/local-groups.ts`).

`contact_permission()` already answers `pauseai-updates` for email. A
member's yes is unsure, because CiviCRM's unsubscribes are invisible to
us; a yes from our own forms' box (`site-forms`) is sure. Luma contacts
are a yes for `luma-calendar` only, which isn't consent to the weekly.

## The blocker: CiviCRM's unsubscribes

People leave the weekly in CiviCRM, by its footer link, "stop all
PauseAI email", or do-not-email after a complaint or bounce. Airtable
keeps "Keep me informed" as it was at sign-up. Moving the list without
those would email people who asked us to stop.

1. **Ask Global** for the UK list's unsubscribe and do-not-email flags,
   once or as a feed, hashed if that helps, used only to suppress. A
   read key and an opt-out feed were refused on 19 Oct, so ask for the
   smallest thing, offering: suppression only, nothing else kept,
   revocable.
2. **If Global says no, move people by asking.** For a few editions the
   CiviCRM weekly says it's moving, with a button to keep getting it.
   A click is a yes on pauseai.uk; anyone else isn't moved. Then the
   CiviCRM weekly stops.

Either way only a yes gets the weekly. Global's unsubscribes would turn
members' unsure into yes or no; without them, we ask.

Other sources cover part of it: MailerLite and MailerSend suppressions
(Global's newsletter, not the weekly; not asked for), Postmark's bounces
and complaints (built), the Luma contacts pass (built).

## Steps

1. **A "UK weekly" topic** in `contact_permission()`, its yes from the
   move button, our forms' box and Global's flags.
2. **The email channel for supporters.** Postmark's broadcast stream
   ([streams](https://postmarkapp.com/message-streams)), apart from MP
   letters; about $200–300 a year
   ([pricing](https://postmarkapp.com/pricing)). Postmark vets broadcast
   senders, so apply early. A small local mailing may go from a staff
   member's Gmail, through the backend `plans/politician-email.md`
   builds.
3. **Unsubscribe**: a link in every message and the
   `List-Unsubscribe` header, to a page offering less before nothing
   (weekly only, urgent only, my local group, a three-month pause).
   Postmark's unsubscribe and complaint webhooks write
   `contact_unsubscribes`.
4. **The weekly's blocks**: headline events with sign-up counts, events
   near you, your MP, filled per supporter.
5. **Before the first send**: Postmaster Tools and DMARC reports, so we
   see spam rates. Google wants complaints under 0.1%
   ([sender guidelines](https://support.google.com/a/answer/81126)).
   pauseai.uk's DMARC is `p=none` with no reports.

## Getting more yeses and places

- Our own join form on pauseai.uk instead of pauseai.info's iframe, with
  "PauseAI UK can email me", still passing people to Global. pauseai.uk
  brought in 351 of 427 UK signups in October.
- "Also get the UK weekly?" on Luma registrations.
- "Your postcode (the first half is fine)" on every Luma event, which
  the import already reads. Events near you need a town; your MP needs a
  full postcode.

## Global and the legal pack

The [legal pack](https://github.com/PauseAI/legal-pack) (v1.0, unsigned)
bars exports and other sending tools (2.2) and processors (6), but
leaves the UK sole controller of records with nothing from the shared
database (2.3), which covers our own list. Its "Member Data" includes
"event attendees… in whatever system", which may claim our Luma data.
Signing 2.2 as drafted would end the members import. Germany, France and
Spain run their own lists. Present the move as what Germany does, and
keep passing signups to Global.

## Data protection

Unsubscribes from Stichting PauseAI, kept after erasure as opt-outs
are; the weekly as a new use, with Postmark's broadcast stream; our join
form as a new source. The privacy policy says we email those who said
yes, and how to stop.

## Open questions

1. **Who asks Global**, given its leadership is changing? The agreement
   is with the Stichting's board.
2. **How long to wait** for an answer before moving people by asking?
3. **The legal pack**: sign as drafted, or propose changes, after the
   UK's own legal advice?
4. **Luma registrants**: the Data (Use and Access) Act 2025 extends the
   soft opt-in to charities. Is it in force, does it cover Safe AI
   Alliance Ltd, and does registering for an event count?
5. **For Global**: can chapter admins see who unsubscribed from a UK
   mailing, and SES complaint counts?
