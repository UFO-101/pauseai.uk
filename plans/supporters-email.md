# PauseAI UK's weekly email, from pauseai.uk

Draft v6, 26 Oct 2026. The list is partly built; sending isn't.

Joseph writes the UK weekly in CiviCRM and sends it to about 1,260
people. We'll send it from pauseai.uk instead, to our own list, so it
can be personal (events near you, your MP) and the UK controls it.

- **The blocker: CiviCRM's unsubscribes.** People who left the UK weekly
  did so in CiviCRM, which we can't see. Moving the list without them
  would email people who asked us to stop.
- **The fallback:** gather what unsubscribes we can elsewhere, and move
  people over by asking, so everyone on our list has said yes to
  pauseai.uk.

## 1. Today

A CiviCRM chapter mailing to the UK list, from `hello@pauseai.uk`. On
15 Oct: 1,262 recipients, 99.6% delivered, 13.5% clicked, 9
unsubscribed. Apart from Joseph's lead story, it's mostly Luma events,
which we can generate: headline events with sign-up counts, and events
by local group (`eventMatchers` in `lib/content/local-groups.ts`).

## 2. Plan

1. **Send from pauseai.uk:** a "UK weekly" topic in
   `email_permission()`, an unsubscribe page, a composer that fills in
   each person's events and MP, and Postmark's broadcast stream.
   Postmark vets broadcast senders, so apply early.
2. **The blocker: ask Global for the UK list's unsubscribes.** Its
   "leave this list", "no bulk email" and "do not email" flags for
   UK-list addresses, once or as a feed, hashed if that helps, used only
   to suppress. A read key and an opt-out feed were refused on 19 Oct,
   so ask for the smallest thing.
3. **The fallback, if Global says no:**
   - **Unsubscribes from elsewhere** (section 4). They cover part of the
     UK list, not all of it.
   - **Move people by asking.** A UK weekly from CiviCRM saying the
     weekly is moving to pauseai.uk, with a button to keep getting it. A
     click is a yes on pauseai.uk; anyone who doesn't click isn't moved.
     Repeat it for a few editions, then stop the CiviCRM weekly.
   - **New people say yes on pauseai.uk** (section 5).
4. **Alongside:** Postmaster Tools and DMARC reports, so we see spam
   rates; a postcode question on every Luma event.

Either way, only people with a yes get the weekly from pauseai.uk.
Global's unsubscribes let us move people without asking them; without
them, we ask.

## 3. What's built

- **Supporters:** UK members (Airtable) and Luma people, imported
  hourly, linked with letter writers.
- **`email_permission()`:** yes, no or unsure for each address and
  topic. Members are "unsure" for PauseAI updates, as CiviCRM's
  unsubscribes are invisible.
- **The Luma topic** means "may we message them through Luma". It isn't
  consent to the weekly: Luma's terms need "explicit consent".
- **Luma's contacts are its email list.** Registering for an event or
  following the calendar adds someone. Unsubscribing by the link in any
  event blast, or marking one as spam, takes them off the list (the
  dashboard's People page and the API alike) and turns Follow off; so
  does our removing or blocking them. Following again puts them back as
  they were, with their first join date. Unfollowing changes nothing
  that matters for email. Tested by hand, 26 Oct.
- **The webhook** tells us of an unsubscribe at once, but not of someone
  following again, nor of removals and blocks. So the import's full pass
  over the contacts, daily, records the rest: a contact it doesn't list
  is opted out, and one who reappears is opted back in. A contact is
  then a yes, however old; "unsure" goes for Luma. Built on branch
  `luma-contacts-gone`.
- **Registered but never a contact:** 43 people registered and were
  approved for our own events but aren't on the list. They most likely
  unsubscribed before the webhook existed, so they're a no.

## 4. The blocker: CiviCRM's unsubscribes

People leave the UK weekly in CiviCRM: by its footer link (that list
also carries urgent UK emails), "stop all PauseAI email", or
do-not-email after a complaint or bounce. Airtable keeps "Keep me
informed" as it was at sign-up, so we see none of it.

| Source                                   | Status     | Covers                                                                                                                                             |
| ---------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Global: the UK list's unsubscribes**   | to ask     | All of it: the blocker                                                                                                                             |
| MailerLite and MailerSend suppressions   | not asked  | Global newsletter and welcome-email unsubscribes, complaints, bounces; not the UK weekly. Global's sync already has them in one file (`suppressions-<runid>.json`) |
| Luma webhook and contacts pass           | built      | Our Luma email: unsubscribes at once, the rest within a day                                                                                        |
| Postmark                                 | built      | Bounces and complaints on our own sends                                                                                                            |
| CiviCRM reports; "remove me" replies     | by hand    | Each weekly's few unsubscribes, if chapter admins can see names                                                                                    |
| Asking                                   | fallback   | Everyone who clicks                                                                                                                                |

## 5. Our own list

- **Our own join form** on [pauseai.uk/#join](https://pauseai.uk/#join)
  instead of pauseai.info's iframe, with "PauseAI UK can email me",
  still passing people to Global if they tick it. pauseai.uk brought in
  351 of 427 UK signups in October.
- **A yes from other places:** "Also get the UK weekly?" on Luma
  registrations, and the consent box on letters, which exists.
- **Two weeklies while people move,** for anyone on both lists. Keep the
  move short.
- **Politics:** it can look like the start of a split. Present it as
  what Germany already does, and keep passing signups to Global.

## 6. Global and the legal pack

Jakub, 19 Oct: no read key, as "member data stays in systems Global
runs". The [legal pack](https://github.com/PauseAI/legal-pack) (v1.0,
unsigned) bars exports and other sending tools (clause 2.2) and
processors (6), but leaves the UK sole controller of records with
nothing from the shared database (2.3), which covers our own list. But
the user agreement's "Member Data" includes "event attendees… in
whatever system", which may claim our Luma data. Signing 2.2 as drafted
would end the members import. The pack isn't compulsory: Germany,
France and Spain run their own lists. When we ask for unsubscribes,
offer guarantees: suppression only, nothing else kept, revocable.

## 7. Who we can reach

Counted 21–23 Oct.

| List                                                           | People |
| -------------------------------------------------------------- | -----: |
| Luma: calendar contacts and guests (2,188 approved for an event) |  2,615 |
| Airtable UK members                                            |  1,471 |
| On both                                                        |    615 |
| CiviCRM UK list                                                |  1,262 |

## 8. Later: every UK email

The weekly comes first; the same system then sends event emails and
urgent one-offs. An email is a definition in code (blocks, audience,
channel); every send checks `email_permission()` and is logged. The
unsubscribe page offers less instead of nothing (weekly only, urgent
only, my local group, a 3-month pause), since people who can choose less
don't report spam.

## 9. Location

A town is enough for events near you; "your MP" needs a full postcode.
We have members' city and postcode, Luma postcode answers and letters'
postcodes. To get more, ask "Your postcode (the first half is fine)" on
every Luma event; the import already picks it up.

## 10. Sending

Postmark's [broadcast stream](https://postmarkapp.com/message-streams),
about $200–300 a year ([pricing](https://postmarkapp.com/pricing)), kept
apart from MP letters. Spam reports decide placement and should stay
below 0.1% ([Google's sender
guidelines](https://support.google.com/a/answer/81126)), so set up
[Postmaster Tools](https://postmaster.google.com/) and DMARC reports
first. pauseai.uk's DMARC is `p=none` with no reports today.

Sending goes through the mail layer built for mail to politicians
(`plans/politician-mailings.md`, phase 2): Postmark and a staff
member's Gmail are two backends behind one `send()`, chosen per mailing,
so a small local send (20 supporters in one constituency) can go from a
person's Gmail and the weekly from Postmark's broadcast stream. Both log
to `email_sends` and share the bounce blocks and `email_permission()`. A
mailing is stored as its template and attachments once, plus each
recipient's merge values, not a copy per person; that also keeps a
supporter's name in one row erasure can delete.

## 11. Data protection

Update `docs/data-protection.md` for: unsubscribes received from
Stichting PauseAI (kept after erasure, as opt-outs are), the weekly as a
new use with Postmark's broadcast stream, and our join form as a new
source. The privacy policy says we email people who said yes, and how to
stop.

## 12. Open questions

1. **Who asks Global** for the UK list's unsubscribes, given its
   leadership is changing? The agreement is with the Stichting's board.
2. **How long to wait** for an answer before moving people by asking?
3. **The agreement:** sign as drafted, or propose changes first? Get the
   UK's own legal advice before taking on uncapped liability.
4. **Luma registrants:** may we send them the weekly without a yes? The
   Data (Use and Access) Act 2025 extends the "soft opt-in" to
   charities. Is it in force, does it cover Safe AI Alliance Ltd, and
   does registering count? Otherwise ask on registration.
5. **For Global:** can chapter admins see who unsubscribed from a UK
   mailing? SES complaint counts for UK mailings?

## Sources

- Four sample emails and the 15 Oct CiviMail report; Jakub's Discord
  reply, 19 Oct.
- [PauseAI/legal-pack](https://github.com/PauseAI/legal-pack) v1.0
  (`docs/02a`, `03`).
- pauseai-civicrm: `docs/suppression-reverse-sync.md`,
  `docs/member-import-plan.md`. pauseai-website:
  `docs/join-form-flow.md`.
- Luma, live and its help pages:
  [contacts](https://help.luma.com/p/managing-calendar-contacts),
  [newsletters](https://help.luma.com/p/sending-newsletters.md),
  [webhooks](https://help.luma.com/p/webhooks).

Counts are snapshots.
