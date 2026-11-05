# Politicians without Airtable

Politicians' details are updated every night from the official sources,
staff edit everything else on the site, and the syncs from Airtable's
"UK Politicians" base are switched off. This is one pull request.

Most of it can be built now. Switching Airtable off waits until Joseph
sends mailings from the site rather than Airtable.

## What replaces each Airtable field

The nightly `sync-politicians` job copies two tables from base
`appBInVvIm6opJ1Ob`: the politicians (`lib/server/politician-sync.ts`)
and the Emails table (`lib/server/emails-sync.ts`). Two one-off imports
also read that base (`lib/server/outside-services/airtable.ts`).

| Airtable                                                | Replaced by                                       |
| ------------------------------------------------------- | ------------------------------------------------- |
| Name, body, constituency, party, country, email, status | The official sources, every night                 |
| Salutation                                              | Staff, with a new politician's drafted by an LLM  |
| Notes, Recommended                                      | A note in their history, from Airtable            |
| Important target, Personal connection                   | Staff                                             |
| Signed Frontier AI Letter, Edinburgh conference         | Staff                                             |
| Signed DeepMind Letter                                  | Nothing; the letter was in 2025, so it's kept     |
| ControlAI Signatory                                     | ControlAI's own page, every night                 |
| Emails table                                            | Mailings sent from the site; the history is kept  |
| Test records                                            | The site's own test politicians                   |
| Web form emails, Go to Parliament                       | Nothing; both were imported once already          |

The members import reads a different base, Stichting PauseAI's
"Members & Actions", and isn't affected.

## Official sources

Each politician stores the ID their legislature gives them, so someone
who leaves and comes back, or moves from one house to another, stays
one record. Alongside it, a column for each standard key that other
sources use, so a politician can be matched to them without a name
lookup: a Wikipedia article title, a TheyWorkForYou person ID, and
whatever else turns up (Wikidata, Democracy Club). TheyWorkForYou's
[people data](https://www.theyworkforyou.com/api/) already links its
MPs, Lords, MSPs and MLAs to their Wikipedia articles and official IDs,
so it can fill those columns in one pass.

| Body                | Source                                                                                              | ID                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Commons and Lords   | [Members API](https://members-api.parliament.uk/)                                                   | `id`, the same in both Houses (Baroness May is 8 in both)        |
| Scottish Parliament | [data.parliament.scot](https://data.parliament.scot/api/members)                                    | `PersonID`                                                       |
| NI Assembly         | [data.niassembly.gov.uk](https://data.niassembly.gov.uk/members.asmx)                               | `PersonId`                                                       |
| Senedd              | [`GetCouncillorsByWard`](https://business.senedd.wales/mgwebservice.asmx/GetCouncillorsByWard), XML | `councillorid`, the same across terms (Huw Irranca-Davies, 5053) |

All four give each member's name, party, constituency and email.

- The Members API is already read for sitting MPs and their emails
  (`lib/parliament.ts`), for the nightly check against Airtable
  (`lib/server/mp-check.ts`). It also gives the reason a membership
  ended. Its `nameAddressAs` field is mostly empty, so it can't give
  salutations.
- Joseph made the salutations in Airtable with an LLM: for each
  politician it searched for information about the person and chose the
  salutation from what it found. The site can do the same for a new
  politician, but from a fixed source rather than a web search: their
  Wikipedia article, found by the key above, has the title, honorifics
  and peerage the salutation depends on. Staff check and correct it.
- The Scottish Parliament gives emails and parties from separate
  endpoints, keyed by `PersonID`.
- The NI Assembly gives emails from `GetAllMemberContactDetails_JSON`,
  in a field spelt `EmaiAddress`. Its `MemberPrefix` and
  `MemberLastName` fields make a salutation, such as "Dr Aiken".
- The Senedd lists members under their constituency (`wardtitle`), with
  their terms of office. It worked in a browser, but refused our
  requests with a 403.

- Politicians' own domains, which show whose office a thread with an email
  address on one is from (`plans/mp-correspondence.md`), come with each
  body's sync. A domain counts only if it belongs to one politician, and
  social media and party sites are skipped. The Scottish Parliament's
  `websites` and `emailaddresses` endpoints have them: up to 53 of its 129
  current members list a site that isn't parliament.scot's, a count that
  includes party sites, social media and malformed links. The Senedd's
  `additionalcontactinfo` has few, mostly social media. The NI Assembly's contact details have only its own domains.

## Steps

1. Add each body's ID to `politicians`, unique within the body, and a
   column per standard key (Wikipedia title, TheyWorkForYou person ID).
   Match the politicians we have to the official lists once, by name,
   body and constituency, and list any that don't match so staff can
   match them by hand. Fill the standard keys from TheyWorkForYou's
   data, which links each person to their official ID.
2. Replace the Airtable copy in `sync-politicians` with a nightly update
   from the official sources, folding in the checks in `mp-check.ts`. It
   adds new members, marks those who have left with the reason, and
   updates names, parties, constituencies and emails. A large change is
   held for someone to check, as now: it shows on the staff home page
   and can be applied on the Import page. The site also emails
   `POLICY_INBOX` about it, as it does for a bounce.
3. Let staff edit a politician's salutation and markers (important
   target, personal connection), and add people who aren't in any
   official list (house `other`). A change of their office status needs
   the date it happened and a note. A new politician's salutation is
   drafted by an LLM from their Wikipedia article, as Joseph's were in
   Airtable, and marked as a draft until staff have checked it; without
   an article, it's made from the name.
4. The asks page shows how many politicians received a letter about
   each ask, from a mailing or a campaign.
5. Read ControlAI's statement every night from
   [controlai.org/statement](https://controlai.org/statement), with the
   statuses owned by `controlai`, as `import-controlai` already does for
   ControlAI's letter to the PM (`lib/server/controlai-import.ts`). Each
   supporter on the page links to their official profile, so most can
   be matched by ID: on 28 October, 141 linked to
   `members.parliament.uk/member/{id}` and 26 to
   `aims.niassembly.gov.uk` with a `per=` ID. The 14 Scottish and 5
   Senedd links contain a name, so those are matched by name. If the
   page has too few names, nothing is changed, as with the letter.
6. Switch off Airtable: remove the syncs, the one-off imports, their
   rows on the Import page and the base's token. Politicians keep their
   `airtable_id`. Each politician's Airtable notes, with a line saying
   Recommended if it was ticked, become one note in their history,
   written by "Airtable" and dated the day it's switched off; then
   `notable_people.notes` and the Notes from Airtable card go.

## Open questions

1. If the Senedd refuses requests from Netlify as well, we could ask
   the Senedd to allow us, use another source such as TheyWorkForYou,
   or let staff keep its 96 members up to date by hand.
2. Which standard keys to store beyond Wikipedia and TheyWorkForYou,
   and whether to make the salutation from Wikipedia alone or let the
   LLM search as Joseph's did.
