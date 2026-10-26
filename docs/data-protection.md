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

| Data                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Why                                                                                                            | Condition                                                                                                                                                                                                               | Where                                                                                                                                                | Kept                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Letters to MPs**: sender's name, email, address and postcode, the campaign, the MP, the subject, the status and events (sent, bounced, replied), and the consent checkbox                                                                                                                                                                                                                                                                                                    | To send the letter from an address of ours, forward the MP's reply, and show staff what happened               | Legitimate interests (running the campaign the person took part in); the consent checkbox for contact about events; Article 9(2)(d) for the political opinion the letter shows (below)                                  | `letters`, `supporter_letters`, `letter_events`, `email_sends`                                                                                       | Until erased on request. The letter's text isn't kept here; the copies are the one Bcc'd to the policy team's inbox in Gmail (`REPLIES_INBOX`), with each MP's reply forwarded there too. Nothing is copied to Airtable; letters sent through the earlier form, whose emails Airtable sent, are still in its "Web form emails" table |
| **Letters sent through pauseai.info's earlier form** (July 2025 to October 2026): sender's name, email and postcode, the campaign, the politician, the subject, when it was sent, and the consent box (blank, before 23 September 2026, counts as no). Not the message, nor "Attending Parliament 23 June 2026"                                                                                                                                                                | So each sender is one supporter with the rest of what they've done with us                                     | As letters to MPs. The senders gave these to PauseAI for the letter; they're copied once from Airtable's "Web form emails"                                                                                              | `supporter_letters` (with `airtable_id`), `letters`                                                                                                  | Until erased on request, like any letter. The record stays in Airtable, which erasure reaches by hand (below)                                                                                                                                                                                                                        |
| **Politicians**: name, salutation, email, party, constituency, country, city, notes, whether in office, their answers to our asks, and PauseAI's emails to them (when, which mailing, whether personalised or written with AI; no text)                                                                                                                                                                                                                                        | To campaign at them                                                                                            | Legitimate interests; public figures in their public role                                                                                                                                                               | `notable_people`, `politicians`, `ask_statuses`, `pauseai_letters`, copied nightly from Airtable                                                     | Kept, marked when they leave office. Go to Parliament's import reads only each guest's MP and meeting status, nothing about the constituent                                                                                                                                                                                          |
| **Luma registrations and contacts**: name, email, which events they registered for and with what status, a phone number and a postcode where the event asked, `utm_source`, when they followed the calendar and when Luma last listed them as a contact                                                                                                                                                                                                                        | To know who comes to our events and to run them; later, to tell people about events near them                  | Article 9(2)(d), as members and people in regular contact (below); legitimate interests for running events                                                                                                              | `luma_people`, `luma_guests`, `luma_events`, copied hourly from Luma                                                                                 | Until erased on request. A guest gone from Luma's list, or an event gone from the calendar's, is marked removed and kept                                                                                                                                                                                                             |
| **Members**: name, email, phone, city, postcode, when and through which site they joined PauseAI, what they said on the join form they wanted to do, and the two consents ("Keep me informed", and sharing their details with PauseAI UK)                                                                                                                                                                                                                                      | To know who in the UK has joined PauseAI, and what they want to do; later, to tell them about events near them | Article 9(2)(d), as members (below). The share box is the consent to Stichting PauseAI disclosing them to us; members who joined before it was asked (July 2026) joined the movement of which PauseAI UK is the chapter | `members`, copied hourly from Stichting PauseAI's member database (Airtable) for UK members who shared their details or joined before that was asked | Until erased on request, when the record's ID goes in `members_erased` so it's never copied back. A member no longer read (moved abroad, stopped sharing, merged) is marked removed and kept until erased                                                                                                                            |
| **Supporters**: the link between a Luma user, a letter writer and a member with the same email                                                                                                                                                                                                                                                                                                                                                                                 | So staff see one person, not two records                                                                       | As above                                                                                                                                                                                                                | `supporters`, `supporter_links`                                                                                                                      | With the records it links                                                                                                                                                                                                                                                                                                            |
| **Opt-outs**: an email address and that it unsubscribed from the Luma calendar's emails, or left "Keep me informed" unticked when joining PauseAI, and when                                                                                                                                                                                                                                                                                                                    | To never email an address that asked us not to                                                                 | Legal obligation (PECR, the right to object)                                                                                                                                                                            | `opt_outs`                                                                                                                                           | Kept after erasure: it exists to honour the person's wish                                                                                                                                                                                                                                                                            |
| **Email problems and blocks**: an address, that an email to it bounced or was reported as spam, and the provider's reason                                                                                                                                                                                                                                                                                                                                                      | To not send to it again                                                                                        | Legal obligation and legitimate interests (deliverability)                                                                                                                                                              | `email_problems`, `email_blocks`                                                                                                                     | Kept after erasure, for the same reason                                                                                                                                                                                                                                                                                              |
| **Staff**: pauseai.uk addresses, login links and sessions (with the User-Agent of the browser each began in, to say which browser and system it is), accounts and their permissions, when each account last logged in and was last seen, and the audit log of what each staff member did (including which supporter they viewed or erased, by ID). Every pauseai.uk address that logs in gets an account, volunteers' included, and access ends when their Google account does | To run the staff interface and to be able to show who saw what                                                 | Legitimate interests                                                                                                                                                                                                    | `staff_login_links`, `staff_sessions`, `staff_accounts`, `audit_log`                                                                                 | Links 15 minutes, sessions a day, or 30 days renewed on use when kept; the audit log indefinitely, holding IDs and references, not names or addresses                                                                                                                                                                                |
| **Postcodes typed on the home page** for events near you                                                                                                                                                                                                                                                                                                                                                                                                                       | To show nearby events                                                                                          | Legitimate interests                                                                                                                                                                                                    | Nowhere: sent to postcodes.io and kept in the browser's session storage                                                                              | Not kept                                                                                                                                                                                                                                                                                                                             |
| **Analytics**                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | To see how the site is used                                                                                    | Consent (the cookie banner)                                                                                                                                                                                             | Google Analytics, controlled by Stichting PauseAI                                                                                                    | Per Google's and Stichting PauseAI's terms                                                                                                                                                                                                                                                                                           |
| **Donations**                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | To take and record donations                                                                                   | Contract and legal obligation                                                                                                                                                                                           | Stripe; a record here                                                                                                                                | 6 years, per the privacy policy                                                                                                                                                                                                                                                                                                      |

## Political opinions

Who registered for a PauseAI protest, or wrote to their MP under a PauseAI
campaign, reveals a political opinion, which is special category data. The
condition is Article 9(2)(d): processing by a not-for-profit body with a
political aim, in the course of its legitimate activities, relating to its
members, former members or persons who have regular contact with it, with
no disclosure outside the body without consent. It needs:

- no disclosure outside PauseAI UK without the person's consent. Stichting
  PauseAI's member database shares a member's details with PauseAI UK
  where the member ticked "share your details with PauseAI UK", or joined
  before the form asked (July 2026): Stichting PauseAI accept this, and
  their privacy policy says chapters receive members' details. The same
  consent would be needed the other way. Stichting PauseAI is a separate
  controller, not our processor;
- security in proportion: staff accounts and the `supporters` permission,
  each viewing in the audit log, erasure on request, and the backups'
  retention below;
- the privacy policy saying so.

## "Keep me informed"

The join form's box, stored as `members.keep_informed`, meant different
things by when the record was made (the `email_permissions` view reads it
so):

- before February 2026 there was no box, and every sign-up joined the
  mailing list;
- February to June 2026 the box was on a Tally form and required, so a
  tick says nothing;
- from 30 June 2026: "Connect me with my local PauseAI chapter, and keep
  me updated on global campaigns.";
- from 21 August 2026: "Get global campaign updates, plus news and ways to
  help from your local chapter.", with critical alerts possibly sent
  anyway and unsubscribing from any list at any time;
- from 4 October 2026: "Global campaign updates, plus news and ways to
  help from {chapter}" for those who shared their details, else "Global
  campaign updates and ways to help."

So a tick from 30 June 2026 by someone who shared their details is
consent to news from PauseAI UK, and leaving it unticked then is recorded
as an opt-out from `pauseai-updates`. Airtable keeps the box as it was at
signup: later unsubscribes are in CiviCRM, which the site doesn't read yet.

## Processors

| Processor            | What it does                                                                                                                                                                                                                                    | Where                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Netlify              | Hosts the site and its database; keeps database backups for 3 to 30 days by plan                                                                                                                                                                | US, with the UK addendum |
| Cloudflare           | Holds our nightly database backup in R2 for 90 days (`backup/README.md`)                                                                                                                                                                        | US/EU                    |
| Luma                 | Runs the events calendar and registrations; the source of the Luma data; tells us of unsubscribes                                                                                                                                               | US                       |
| Postmark             | Sends the letters, forwarded replies and staff emails; tells us of bounces and complaints                                                                                                                                                       | US                       |
| postcodes.io         | Turns a postcode into a constituency or a place; keeps nothing                                                                                                                                                                                  | UK                       |
| Airtable             | The politicians, their answers and PauseAI's emails to them; letters sent through the earlier form ("Web form emails"), copied once; Go to Parliament's meetings; Stichting PauseAI's member database, which we read as a separate controller's | US                       |
| Cloudflare Turnstile | The anti-spam check on the letter form                                                                                                                                                                                                          | US                       |

## Erasure and access

A request arrives as an email address, to the address in the privacy
policy, and is answered within a month. Staff with the `supporters`
permission find the supporter by email and erase them from their page,
giving the request's reference, which goes in the audit log without the
name or address. That deletes what each source holds here ("Supporters" in
`docs/domain-concepts.md`). Then by hand:

- in Luma, remove the person from the calendar's contacts, and ask Luma
  about its guest lists of past events (the API offers neither for us to
  do automatically; removal is documented but we keep that step a
  person's);
- the copy of each letter and reply in the policy team's Gmail inbox;
- any letter they sent through the earlier form, in Airtable ("Web form
  emails");
- a member: tell Stichting PauseAI, who hold the member database, if the
  person wants to leave PauseAI as a whole, not only PauseAI UK. Passing
  erasure requests between us and them isn't automated;
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
  events, wrote to their MP or joined PauseAI in the UK: name, contact
  details, which events, which letters, how they joined. So that staff can see who is involved and, later, tell
  people about events near them.
- **Necessity.** The site already held the letters, Luma the
  registrations and Stichting PauseAI's member database the members who
  shared their details with us; the change is a copy of Luma's data and
  of those members, and a link between them. Without it, staff export
  guest lists and members by hand into spreadsheets, which is less secure
  and less erasable.
- **Risks.** Disclosure of political opinions through a staff account:
  met by the `supporters` permission on every page with supporter data
  but the audit log, which only admins see; a storyboard check that, with
  no permissions, no staff page holds a supporter's name or email; login
  by emailed link to a pauseai.uk address; sessions of a day, or 30 days
  renewed on use; and the audit log of each viewing. Keeping data longer than needed: met by erasure on request and
  the backups' expiry. Mailing someone who opted out: met by `opt_outs`
  being kept after erasure and checked by any future mailing.
  Mailing a member who unsubscribed after joining: Airtable doesn't know
  of it, and CiviCRM, which does, isn't read yet; met by nothing mailing
  members until it is, and by the supporter's page saying so.
  Inaccuracy: the data is Luma's and the member database's own, refreshed
  hourly.
- **Rights.** Access and erasure as above; objection by unsubscribing in
  Luma, which the webhook records, or by leaving "Keep me informed"
  unticked when joining, which the members import records.
- **Conclusion.** The processing is necessary and proportionate for a
  political not-for-profit's contact with its supporters, with the
  measures above. Reviewed when a source or a use is added.
