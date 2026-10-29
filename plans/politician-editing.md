# Politicians without Airtable

Politicians' details are updated every night from the official sources,
staff edit everything else on the site, and the syncs from Airtable's
"UK Politicians" base are switched off. This is one pull request.

Most of it can be built now. Switching Airtable off waits until Joseph
sends mailings from the site rather than Airtable.

## What replaces each Airtable field

The nightly `sync-politicians` job runs two syncs from base
`appBInVvIm6opJ1Ob`, one for politicians and one for the Emails table.
Two one-off imports also read that base
(`lib/server/outside-services/airtable.ts`).

| Airtable                                                  | Replaced by                                       |
| --------------------------------------------------------- | ------------------------------------------------- |
| Name, body, constituency, party, country, email, status   | The official sources, every night                 |
| Salutation                                                | Staff, with a new politician's made from the name |
| Notes, Recommended, Important target, Personal connection | Staff                                             |
| Signed Frontier AI Letter, Edinburgh conference           | Staff                                             |
| Signed DeepMind Letter                                    | Nothing; the letter was in 2025, so it's kept     |
| ControlAI Signatory                                       | ControlAI's own page, every night                 |
| Emails table                                              | Mailings sent from the site; the history is kept  |
| Test records                                              | The site's own test politicians                   |
| Web form emails, Go to Parliament                         | Nothing; both were imported once already          |

The members import reads a different base, Stichting PauseAI's
"Members & Actions", and isn't affected.

## Official sources

Each politician will store the ID their legislature gives them, so
someone who leaves and comes back, or moves from one house to another,
stays one record.

| Body                | Source                                                                                              | ID                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Commons and Lords   | [Members API](https://members-api.parliament.uk/)                                                   | `id`, the same in both Houses (Baroness May is 8 in both)        |
| Scottish Parliament | [data.parliament.scot](https://data.parliament.scot/api/members)                                    | `PersonID`                                                       |
| NI Assembly         | [data.niassembly.gov.uk](https://data.niassembly.gov.uk/members.asmx)                               | `PersonId`                                                       |
| Senedd              | [`GetCouncillorsByWard`](https://business.senedd.wales/mgwebservice.asmx/GetCouncillorsByWard), XML | `councillorid`, the same across terms (Huw Irranca-Davies, 5053) |

All four give each member's name, party, constituency and email.

- The Members API gives emails from `/Members/{id}/Contact`, and the
  reason a membership ended. Its `nameAddressAs` field is mostly empty,
  so it can't give salutations.
- The Scottish Parliament gives emails and parties from separate
  endpoints, keyed by `PersonID`.
- The NI Assembly gives emails from `GetAllMemberContactDetails_JSON`,
  in a field spelt `EmaiAddress`. Its `MemberPrefix` and
  `MemberLastName` fields make a salutation, such as "Dr Aiken".
- The Senedd lists members under their constituency (`wardtitle`), with
  their terms of office. It worked in a browser, but refused our
  requests with a 403.

## Steps

1. Add each body's ID to `politicians`, unique within the body. Match
   the politicians we have to the official lists once, by name, body
   and constituency, and list any that don't match so staff can match
   them by hand.
2. Replace `sync-politicians` with a nightly update from the official
   sources, which also does the checks in `lib/server/mp-check.ts`. It
   adds new members, marks those who have left with the reason, and
   updates names, parties, constituencies and emails.
   - A large change is held for someone to check, as it is now. Any
     staff account can apply it on the Import page.
   - A held update appears on the staff home page (`heldSyncs()` in
     `lib/server/staff-dashboard.ts` needs to include the new job), and
     the site emails the politicians' inbox about it, as it does for a
     bounce.
3. Let staff edit a politician's salutation, notes and markers, and add
   people who aren't in any official list (house `other`). A change of
   status needs the date it happened and a note.
4. Let staff set the status of any ask, not only those in
   `trackedAsks`. A politician's page shows the asks they have answered
   or received a letter about, from a mailing or a campaign, and an
   "Add an answer" menu for the others. An ask they never received
   shows nothing, rather than "Not signed". The asks page shows how
   many politicians received a letter about each ask.
5. Read ControlAI's statement every night from
   [controlai.org/statement](https://controlai.org/statement), with the
   statuses owned by `controlai`. Each supporter on the page links to
   their official profile, so most can be matched by ID: on 28 October,
   141 linked to `members.parliament.uk/member/{id}` and 26 to
   `aims.niassembly.gov.uk` with a `per=` ID. The 14 Scottish and 5
   Senedd links contain a name, so those are matched by name. If the
   page has too few names, nothing is changed, as with ControlAI's
   letter.
6. Switch off Airtable: remove the syncs, the one-off imports, their
   rows on the Import page and the base's token. Politicians keep their
   `airtable_id`.

## Open questions

1. If the Senedd refuses requests from Netlify as well, we could ask
   the Senedd to allow us, use another source such as TheyWorkForYou,
   or let staff keep its 96 members up to date by hand.
