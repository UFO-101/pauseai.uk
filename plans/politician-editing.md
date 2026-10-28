# Politicians without Airtable

Politicians updated every night from the official sources, the rest
edited by staff, and the syncs from Airtable's "UK Politicians" base
switched off. One pull request.

Most of it can start now. Switching Airtable off waits until Joseph
sends mailings from the site (`plans/politician-email.md`).

## Where each Airtable field goes

`sync-politicians` (nightly) runs the politicians and Emails syncs from
base `appBInVvIm6opJ1Ob`, and two one-off imports read it too
(`lib/server/outside-services/airtable.ts`).

| Airtable                                                  | Becomes                                      |
| --------------------------------------------------------- | -------------------------------------------- |
| Name, body, constituency, party, country, email, status   | Official sources, nightly                    |
| Salutation                                                | Staff; a new politician's made from the name |
| Notes, Recommended, Important target, Personal connection | Staff                                        |
| Signed Frontier AI Letter, Edinburgh conference           | Staff                                        |
| Signed DeepMind Letter                                    | Kept; the letter was 2025                    |
| ControlAI Signatory                                       | ControlAI's own page, nightly                |
| Emails table                                              | Mailings from the site; history kept         |
| Test records                                              | The site's own test politicians              |
| Web form emails, Go to Parliament                         | Already imported; their code goes            |

The members import reads Stichting PauseAI's "Members & Actions" base,
not this one, and stays.

## Official sources

Each politician stores their body's ID, so someone who returns or
changes house stays one record.

| Body                | Source                                                                                              | ID                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Commons and Lords   | [Members API](https://members-api.parliament.uk/)                                                   | `id`, one across both Houses (Baroness May's is 8)       |
| Scottish Parliament | [data.parliament.scot](https://data.parliament.scot/api/members)                                    | `PersonID`                                               |
| NI Assembly         | [data.niassembly.gov.uk](https://data.niassembly.gov.uk/members.asmx)                               | `PersonId`                                               |
| Senedd              | [`GetCouncillorsByWard`](https://business.senedd.wales/mgwebservice.asmx/GetCouncillorsByWard), XML | `councillorid`, kept across terms (Huw Irranca-Davies's) |

All four give name, party, constituency and email:

- **Members API**: email from `/Members/{id}/Contact`, and why a
  membership ended. `nameAddressAs` is mostly empty, so no salutation.
- **Scottish Parliament**: emails and parties in their own endpoints,
  keyed by `PersonID`.
- **NI Assembly**: emails from `GetAllMemberContactDetails_JSON`, in a
  field spelt `EmaiAddress`. `MemberPrefix` and `MemberLastName` make a
  salutation ("Dr Aiken").
- **Senedd**: members under their constituency (`wardtitle`), with
  terms of office. It answers a browser but refused our requests (403).

## Steps

1. **Official IDs** on `politicians`, unique per body, matched once by
   name, body and constituency. Any left over are listed for staff to
   match by hand.
2. **The nightly update** replaces `sync-politicians` and takes in
   `lib/server/mp-check.ts`. New members are added, leavers marked with
   why, and names, parties, constituencies and emails updated.
   - A large change is held, as now, and any staff account can apply it
     on the Import page.
   - A held run shows on the staff home (`heldSyncs()` in
     `lib/server/staff-dashboard.ts` must include the new job) and
     emails the politicians' inbox, as a bounce does.
3. **Staff editing** on a politician's page: salutation, notes and
   markers, and adding someone no body lists (house `other`). A status
   change takes its real date and a note.
4. **Asks.** Staff set any ask's status, not only `trackedAsks`. A
   politician's page shows the asks they've answered or got a letter
   about (a mailing's or a campaign's), with "Add an answer" for the
   rest, so a blank stays blank instead of "Not signed". The Asks page
   shows how many got a letter about each.
5. **ControlAI's statement**, nightly from
   [controlai.org/statement](https://controlai.org/statement), owned by
   `controlai`. Supporters link to their official pages, so most match
   by ID: `members.parliament.uk/member/{id}` (141 on 28 Oct) and
   `per=` on `aims.niassembly.gov.uk` (26). Scottish (14) and Senedd (5)
   links carry a name instead. Too few names changes nothing, as for
   ControlAI's letter.
6. **Airtable off**: the syncs, the one-off imports, their Import page
   rows and the base's token. Politicians keep `airtable_id`.

## Open questions

1. **If the Senedd refuses Netlify too**: ask the Senedd to allow us,
   use another source such as TheyWorkForYou, or edit its 96 members by
   hand.
