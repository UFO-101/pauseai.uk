# Email to supporters

The UK weekly, and smaller mailings such as a local group's, sent from
pauseai.uk instead of CiviCRM, so they can be personal (events near
you, your MP) and the UK controls the list. Builds on
`plans/mailings.md`. One pull request, once we can read CiviCRM.

## Today

- Joseph writes the weekly in CiviCRM and sends it from
  `hello@pauseai.uk` to the UK list. On 15 Oct: 1,262 recipients, 99.6%
  delivered, 13.5% clicked, 9 unsubscribed. Besides his lead story it's
  mostly Luma events, which we can generate (`eventMatchers` in
  `lib/content/local-groups.ts`).
- `contact_permission()` answers `pauseai-updates` for email. A
  member's yes is unsure, since CiviCRM's unsubscribes are invisible to
  us; a yes from our forms' box (`site-forms`) is sure.
- Luma contacts are a yes for `luma-calendar` only, not the weekly. We
  see Luma's unsubscribes: the webhook at once, and the daily contacts
  pass for removals, blocks, spam reports and following again.

## CiviCRM

People leave the weekly in CiviCRM, by its footer link, by "stop all
PauseAI email", or by being made do-not-email after a complaint or
bounce. Airtable's "Keep me informed" never changes after sign-up. So
moving the list needs CiviCRM's unsubscribes first.

Maxime approved API access to CiviCRM, after a read key and an opt-out
feed were refused on 19 Oct. Jakub is to set it up; there's no date
yet. Only if it never comes: a button in the CiviCRM weekly to keep
getting it from pauseai.uk.

There's no agreement between PauseAI UK and Stichting PauseAI, so both
follow good data protection practice. Someone who joined the UK through
pauseai.info clearly meant us to have their details, so we use them,
as the members import does. What we read from CiviCRM is used only to
suppress. Global's draft [legal pack](https://github.com/PauseAI/legal-pack)
isn't signed by the UK. Germany, France and Spain run their own lists;
we keep passing signups to Global.

## Steps

1. **Read CiviCRM.** Explore the API first. Two things look like ours:
   - bulk opt-out, a no to all bulk email, like our blocked;
   - the UK chapter's mailing list, who's on it or has left it, like
     the weekly.

   Import what fits, kept after erasure as opt-outs are. Then decide how
   the topics fit together: whether `pauseai-updates` and the weekly
   are one, and whether a Luma no or spam report stops the weekly.
2. **A "UK weekly" topic** in `contact_permission()`.
3. **The email channel for supporters**: Postmark's broadcast stream
   ([streams](https://postmarkapp.com/message-streams)), apart from MP
   letters, about $200–300 a year
   ([pricing](https://postmarkapp.com/pricing)). Postmark vets
   broadcast senders, so apply early. A small local mailing can go by
   Gmail instead (`plans/politician-email.md`).
4. **Unsubscribing**: a link in every message and a `List-Unsubscribe`
   header, to a page offering less before nothing (weekly only, urgent
   only, my local group, a three-month pause). Postmark's unsubscribe
   and complaint webhooks write `contact_unsubscribes`.
5. **The weekly's blocks**: headline events with sign-up counts, events
   near you, your MP, filled per supporter.
6. **Before the first send**: Postmaster Tools and DMARC reports.
   Google wants complaints under 0.1%
   ([sender guidelines](https://support.google.com/a/answer/81126)).
   pauseai.uk's DMARC is `p=none` with no reports.

## More yeses and postcodes

- **Our own join form** on pauseai.uk instead of pauseai.info's iframe,
  with "PauseAI UK can email me", still passing people to Global.
  pauseai.uk brought in 351 of 427 UK signups in October.
- **The Luma checkbox** (`plans/supporters-phone.md`), if agreed,
  covers the weekly. Registering alone isn't a yes: the charity soft
  opt-in (PECR 22(3A), since 5 Feb 2026) is only for registered
  charities, and Safe AI Alliance Ltd is a company limited by
  guarantee.
- **"Your postcode (the first half is fine)"** on every Luma event,
  which the import already reads. Events near you need a town; your MP
  needs a full postcode.

## Data protection

Unsubscribes read from CiviCRM, kept after erasure as opt-outs are; the
weekly as a new use, with Postmark's broadcast stream; our join form as
a new source. The privacy policy says we email those who said yes, and
how to stop.
