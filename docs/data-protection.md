# Data protection

What personal data the site holds, why, under which condition, who
processes it, how long it's kept, and how someone gets it erased. This is
the record of processing (UK GDPR Article 30) and, in "Assessment", the
impact assessment for the supporters data. The public side is the privacy
policy at `/privacy` (`app/(site)/privacy/_components/PrivacyPolicy.tsx`).

The data controller is Safe AI Alliance Ltd, trading as PauseAI UK.

## The rule

**A change that touches personal data updates this record and the
privacy policy in the same change**: a new field about a person, a new
source, a new processor, a new use, a new retention. A plan for such a
change (`plans/`) says what it does to this record, to the policy and to
erasure before anything is built. A pull request that adds a table or
column about a person without a change here isn't done.

## What we hold

| Data                                                                                                                                                                                                        | Why                                                                                              | Condition                                                                                                                                                                              | Where                                                                   | Kept                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Letters to MPs**: sender's name, email, address and postcode, the campaign, the MP, the subject, the status and events (sent, bounced, replied), and the consent checkbox                                 | To send the letter from an address of ours, forward the MP's reply, and show staff what happened | Legitimate interests (running the campaign the person took part in); the consent checkbox for contact about events; Article 9(2)(d) for the political opinion the letter shows (below) | `letters`, `letter_events`, `email_sends`                               | Until erased on request. The letter's text isn't kept; the only copy is the one Bcc'd to the policy team's inbox, and the policy team's own copy in Airtable ("Web form emails") |
| **Luma registrations and contacts**: name, email, which events they registered for and with what status, a phone number and a postcode where the event asked, `utm_source`, when they followed the calendar | To know who comes to our events and to run them; later, to tell people about events near them    | Article 9(2)(d), as members and people in regular contact (below); legitimate interests for running events                                                                             | `luma_people`, `luma_guests`, `luma_events`, copied hourly from Luma    | Until erased on request, or until Luma's own list no longer has the guest (then marked removed, kept)                                                                            |
| **Supporters**: the link between a Luma user and a letter writer with the same email                                                                                                                        | So staff see one person, not two records                                                         | As above                                                                                                                                                                               | `supporters`, `supporter_links`                                         | With the records it links                                                                                                                                                        |
| **Opt-outs**: an email address and that it unsubscribed from the Luma calendar's emails, and when                                                                                                           | To never email an address that asked us not to                                                   | Legal obligation (PECR, the right to object)                                                                                                                                           | `opt_outs`                                                              | Kept after erasure: it exists to honour the person's wish                                                                                                                        |
| **Email problems and blocks**: an address, that an email to it bounced or was reported as spam, and the provider's reason                                                                                   | To not send to it again                                                                          | Legal obligation and legitimate interests (deliverability)                                                                                                                             | `email_problems`, `email_blocks`                                        | Kept after erasure, for the same reason                                                                                                                                          |
| **Staff**: pauseai.uk addresses, login links and sessions, permissions, and the audit log of what each staff member did (including which supporter they viewed or erased, by ID)                            | To run the staff interface and to be able to show who saw what                                   | Legitimate interests                                                                                                                                                                   | `staff_login_links`, `staff_sessions`, `staff_permissions`, `audit_log` | Links 15 minutes, sessions a week; the audit log indefinitely, holding IDs and references, not names or addresses                                                                |
| **Postcodes typed on the home page** for events near you                                                                                                                                                    | To show nearby events                                                                            | Legitimate interests                                                                                                                                                                   | Nowhere: sent to postcodes.io and kept in the browser's session storage | Not kept                                                                                                                                                                         |
| **Analytics**                                                                                                                                                                                               | To see how the site is used                                                                      | Consent (the cookie banner)                                                                                                                                                            | Google Analytics, controlled by Stichting PauseAI                       | Per Google's and Stichting PauseAI's terms                                                                                                                                       |
| **Donations**                                                                                                                                                                                               | To take and record donations                                                                     | Contract and legal obligation                                                                                                                                                          | Stripe; a record here                                                   | 6 years, per the privacy policy                                                                                                                                                  |

## Political opinions

Who registered for a PauseAI protest, or wrote to their MP under a PauseAI
campaign, reveals a political opinion, which is special category data. The
condition is Article 9(2)(d): processing by a not-for-profit body with a
political aim, in the course of its legitimate activities, relating to its
members, former members or persons who have regular contact with it, with
no disclosure outside the body without consent. It needs:

- no disclosure outside PauseAI UK without the person's consent. Stichting
  PauseAI's member database shares a member's details with PauseAI UK only
  where the member ticked "share your details with PauseAI UK", and the
  same consent would be needed the other way;
- security in proportion: the `supporters` permission, each viewing in the
  audit log, erasure on request, and the backups' retention below;
- the privacy policy saying so.

## Processors

| Processor            | What it does                                                                                      | Where                    |
| -------------------- | ------------------------------------------------------------------------------------------------- | ------------------------ |
| Netlify              | Hosts the site and its database; keeps database backups for 3 to 30 days by plan                  | US, with the UK addendum |
| Cloudflare           | Holds our nightly database backup in R2 for 90 days (`backup/README.md`)                          | US/EU                    |
| Luma                 | Runs the events calendar and registrations; the source of the Luma data; tells us of unsubscribes | US                       |
| Postmark             | Sends the letters, forwarded replies and staff emails; tells us of bounces and complaints         | US                       |
| postcodes.io         | Turns a postcode into a constituency or a place; keeps nothing                                    | UK                       |
| Airtable             | The policy team's copy of each letter's sender, and the MPs; the global member database           | US                       |
| Cloudflare Turnstile | The anti-spam check on the letter form                                                            | US                       |

## Erasure and access

A request arrives as an email address, to the address in the privacy
policy, and is answered within a month. Staff with the `supporters`
permission find the supporter by email and erase them from their page,
giving the request's reference, which goes in the audit log without the
name or address. That deletes what each source holds here and asks Luma to
remove the contact ("Supporters" in `docs/domain-concepts.md`). Then by
hand:

- the policy team's copy of the letter in Airtable ("Web form emails"),
  and the copy in the policy team's inbox;
- Luma's own guest lists of past events, if Luma will (ask Luma; the API
  doesn't offer it);
- the backups: Netlify's and ours expire by themselves (30 and 90 days),
  which is what the policy says, and they're never restored except to
  recover from a loss, after which the erasure would be repeated.

A request for a copy of someone's data is answered from the supporter's
page, which shows everything held about them, plus the audit log's entries
for their ID.

## Assessment

The impact assessment for the supporters data, as the ICO recommends when
in doubt.

- **What and why.** One staff view of each person who registered for our
  events or wrote to their MP: name, contact details, which events,
  which letters. So that staff can see who is involved and, later, tell
  people about events near them.
- **Necessity.** The site already held the letters, and Luma already
  held the registrations; the change is a copy of Luma's data and a link
  between the two. Without it, staff export guest lists by hand into
  spreadsheets, which is less secure and less erasable.
- **Risks.** Disclosure of political opinions through a staff account:
  met by the `supporters` permission, login by emailed link to a
  pauseai.uk address, a week's sessions, and the audit log of each
  viewing. Keeping data longer than needed: met by erasure on request and
  the backups' expiry. Mailing someone who opted out: met by `opt_outs`
  being kept after erasure and checked by any future mailing.
  Inaccuracy: the data is Luma's own, refreshed hourly.
- **Rights.** Access and erasure as above; objection by unsubscribing in
  Luma, which the webhook records.
- **Conclusion.** The processing is necessary and proportionate for a
  political not-for-profit's contact with its supporters, with the
  measures above. Reviewed when a source or a use is added.
