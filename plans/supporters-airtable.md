# Supporters, phase 2: the global members from Airtable

The third source of supporters: the UK members in Stichting PauseAI's
"Members & Actions" Airtable base, copied hourly into a table of our own,
linked to supporters by email, and shown on the supporter pages with a
Member badge. A member who declined "Keep me informed" at signup gets an
opt-out in `opt_outs`, in the same shape as Luma's unsubscribes. Their
later unsubscribes live in CiviCRM, a source for a later phase.

Draft. It extends phase 1 (`plans/supporters-and-luma.md`, built on branch
`supporters`): `supporter_links`, the three views each source provides,
`opt_outs`, `IMPORT_JOBS`, erasure, the staff pages,
`docs/data-protection.md`. Numbers are from the real base ("What the data
showed"). Decisions taken are marked **decided**; the rest are options
for whoever builds it, and the work left for later is listed at the end.

## What we build

1. **`members`**: Airtable's record as Airtable has it, keyed by
   its record ID. Only the import writes it.
2. **`import-members`**: an hourly job, also run from `/staff/import-data`,
   that reads the UK members we may hold, upserts them, records the
   opt-outs and links supporters.
3. **The source**: its views, `supporter_links` column and badge; "Joined
   PauseAI" in the history; city and postcode in the contact box; "PauseAI
   updates" as a mailing list.
4. **Erasure** of the member row, with `members_erased` so the import
   never copies them back.
5. **Docs**: data protection, the privacy policy, domain concepts,
   development.

Not in it: writing to Airtable, mailing anyone, and the work under
"Later", at the end.

## Who is imported

**Decided.** The join form started asking "Share your details with PauseAI
UK?" in July 2026. Everyone who joined before that is taken to have
agreed: they joined a movement whose UK chapter this is and were never
asked otherwise. Everyone since is imported only if they ticked it.
Stichting PauseAI, the other controller, accepts this, and their policy
says chapters receive members' details. The cut-off dates here and under
"Opt-outs" are the form changes' commit dates, not deploy dates, which is
close enough.

```
{Country} = 'United Kingdom'
AND ({GDPR chapter share permission} = TRUE() OR IS_BEFORE({Created Datetime}, '2026-07-01'))
AND {Merged into} = BLANK()
```

This is the global team's own roster rule ("Excluded from chapter roster")
with a date in place of the wording field, which catches the one
July–September row that was asked and said no. `Merged into` rows are the
losing half of a duplicate merge, which the global team keep and skip.
About 1,500 rows.

Left out: the hand-set `duplicate` box (65 rows; the email matcher joins
true duplicates anyway), the 100 rows with no country, and the 53 in
Ireland (there's no Northern Ireland choice; someone in Belfast most
likely chose United Kingdom).

## The table

```sql
-- Each UK member we may hold, as the global membership dataset has them
-- (Airtable today), keyed by the Airtable record ID. Only the import writes it.
CREATE TABLE members (
  id text PRIMARY KEY,                    -- the Airtable record ID, "recXXXXXXXXXXXXXX"
  email text NOT NULL CHECK (email = lower(email)),
  name text NOT NULL DEFAULT '',
  phone text,
  city text,
  postcode text,                          -- "Zip code", as typed
  joined_at timestamptz NOT NULL,         -- "Joined Datetime": their first join
  created_at timestamptz NOT NULL,        -- "Created Datetime": this row; the date rules key on it
  keep_informed boolean NOT NULL,         -- "Email subscription", as it stands
  share_permission boolean NOT NULL,      -- "GDPR chapter share permission", as it stands
  source_page text,                       -- "Source page": the site the form was on; blank before September 2026
  intent text,                            -- "Intent": Keep informed, Act now, Volunteer, Lead or None; null before June 2026
  source_modified_at timestamptz NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  changed_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz                  -- no longer matched the filter at the last run
);
CREATE INDEX members_email ON members (email);

-- Members erased at their request, whom the import never brings back:
-- the Airtable record ID, the same key as members.id.
CREATE TABLE members_erased (
  id text PRIMARY KEY,                    -- the Airtable record ID, "recXXXXXXXXXXXXXX"
  erased_at timestamptz NOT NULL DEFAULT now()
);
```

### Fields

The Members table has 79 fields. Only the ones fetched (`fields[]` on the
request) are copied, so adding one later is a column, a name in the list
and a line in `docs/data-protection.md`. Counts are of the 1,566 UK rows.

| Field                                                                                                                                                                                                 |             Filled | Verdict                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -----------------: | ------------------------------------------------------------------------------------------------------------------- |
| Full name, Email, Phone, City, Zip code                                                                                                                                                               |               most | **Take.** 66 emails need lowercasing; 463 of 485 phones are +44; every Zip code is a full UK postcode               |
| Joined Datetime, Created Datetime, Last Modified                                                                                                                                                      |                all | **Take.** Joined is the first join (107 re-joined); Created is this row's                                           |
| Email subscription, GDPR chapter share permission                                                                                                                                                     | 1054 / 1008 ticked | **Take.** The two consents; see "Opt-outs"                                                                          |
| Email subscription (old)                                                                                                                                                                              |                 79 | Fold in: its No (2 rows) counts as unticked                                                                         |
| Source page (pauseai.uk 562, pauseai.info/join 258, /subscribe 26, pauseai.info 12, other 2)                                                                                                          |                860 | **Take.** Which site the join form was on: through our embed, or on pauseai.info. Blank before September 2026       |
| Country, Merged into                                                                                                                                                                                  |                    | In the filter only                                                                                                  |
| Intent (Volunteer 777, Act now 345, Lead 48, None 396)                                                                                                                                                |               1566 | **Take.** The option they took on the join form, from June 2026: what they want from us. Shown on the page; a badge |
| Email 2                                                                                                                                                                                               |                  3 | Option: a second address to link by. Not worth it yet                                                               |
| Skills & Interests, Projected weekly hours, Discord Username, Signed statement                                                                                                                        |               ~600 | Option: each needs a place on a page and a line in the record. Not this phase                                       |
| Languages, Motivation, Discovery, University, Teams, Paying member, the agreements, Photo, Bio, About, Signup source, Form version, Emails sent, duplicate, GDPR chapter share wording, PauseAI Email |                    | No: the global team's business, or profiling we have no use for                                                     |

**Decided:** the rows marked Take, and nothing else this phase.

## Opt-outs

`opt_outs` records events: an address left a list at a time, and came
back at a time, told by a source with its own reference so the same news
twice is kept once. Luma's webhook fits that exactly. For members:

**Airtable's "Email subscription" box is the join form's "Keep me
informed"**, written at signup and never changed when someone later
unsubscribes. What it says yes to (`pauseai-website`,
`OnboardingFlow.svelte`, `messages.ts`):

- 30 June 2026: "Connect me with my local PauseAI chapter, and keep me
  updated on global campaigns."
- 21 August 2026: "Get global campaign updates, plus news and ways to help
  from your local chapter." Under it: critical alerts may come anyway;
  unsubscribe from any list at any time.
- 4 October 2026: "Global campaign updates, plus news and ways to help from
  {chapter}" if they shared their details, else "Global campaign updates
  and ways to help."
- February to June 2026 the box was on a Tally form and **required**, so
  every row is ticked and proves nothing. Before February there was no
  box, and every signup joined the mailing list anyway.

So a free tick from 30 June 2026 by someone who shared is consent to news
from PauseAI UK: the consent "events near you" needs from a member. The
Substack newsletter is a separate box, not in Airtable.

**The unsubscribes are in CiviCRM**, which has owned subscriptions since
the global team's mailings moved there (first import 28 June 2026; there
was no cutover, Airtable still owns the member fields). MailerLite's
pre-CiviCRM newsletter unsubscribes were imported there as per-list
removals; CiviMail's own are native. Airtable never had them. CiviCRM
keeps several things apart, and so must we: a per-list removal (group
status `Removed`, dated in `subscription_history`: `member_mailing_list`,
`critical_alerts_list`, `local_group_invitations`, chapter lists), the
bulk opt-out `is_opt_out`, `do_not_email` (spam complaints and MailerSend
unsubscribes) and `on_hold` (bounces).

### Lists

Named for what was opted out of, not the system that told us, so an
address has at most one opt-out in force per list, whoever reported it.

**After this phase, two lists exist:** `luma-calendar`, which phase 1
made, and `pauseai-updates`, which this phase adds along with the source
`airtable-import`, to the `CHECK`s, `OPT_OUT_LISTS`, `OptOutSource` and
the staff copy. Nothing else is added now.

| `list`            | Meaning                                               | Told by                                                  |
| ----------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| `luma-calendar`   | the Luma calendar's emails                            | `luma-webhook`                                           |
| `pauseai-updates` | "Keep me informed": campaign updates and chapter news | `airtable-import` (this phase); `civicrm-import` (later) |

**The CiviCRM lists come later**, with the CiviCRM source, once there is
a key. They are listed here only so this phase's names leave room for
them; none is created now:

| `list`                  | Meaning                           | CiviCRM fact                      |
| ----------------------- | --------------------------------- | --------------------------------- |
| `pauseai-updates`       | as above                          | `member_mailing_list` Removed     |
| `pauseai-alerts`        | the critical alerts               | `critical_alerts_list` Removed    |
| `pauseai-local-invites` | invitations from local groups     | `local_group_invitations` Removed |
| `pauseai-all`           | no bulk email from PauseAI at all | `is_opt_out`                      |

`do_not_email` and `on_hold` are blocks, not opt-outs: ignore them until
the site mails members, then copy `do_not_email` into `email_blocks` with
a `civicrm` kind.

### This phase: the checkbox

An `opt_outs` row says "don't send this address this list". The opt-out
is in force while the row's `resubscribed_at` is null. Setting that date
lifts it, meaning the person came back; a lifted opt-out no longer stops
mail, and the row stays as history.

**Decided.** Someone who left "Keep me informed" unticked, when ticking
it was a free choice, is treated as opted out of `pauseai-updates`. They
never unsubscribed, but the question the table answers is "may we send
this address the updates?", and for that the answer is the same. The
box is stored twice: `members.keep_informed` holds exactly what Airtable
has, for every row, and `opt_outs` holds the rows below, which are what
a sender checks and where CiviCRM's unsubscribes will later be added too.

What the import does with the box, each run:

- **Unticked, and the row was created on or after 30 June 2026**, when
  the box was optional: add an opt-out from `pauseai-updates` if the
  address has none in force. Its `source` is `airtable-import`, its `source_ref`
  the record ID, its `unsubscribed_at` the row's `created_at`. The old
  Yes/No field saying No counts as unticked. About 180 people.
- **Unticked, and the row was created before 30 June 2026**: nothing.
  Either the form required the box or there was none, so they were on
  the list regardless, and whether they have since left is for CiviCRM
  to say.
- **Ticked, and the address has an opt-out in force that the import
  itself made** (source `airtable-import`) **dated before the row was
  last modified**: lift it by setting `resubscribed_at`. This happens
  when someone re-joins and ticks the box this time. The import never
  lifts an opt-out another source made, so a CiviCRM unsubscribe always
  stands.
- **A row that stops matching the filter, or is erased**: its opt-outs
  are left as they are.

Rejected: treating every unticked row as opted out, about 500, 300 of
whom were never offered the box. CiviCRM would later contradict it.

For later mailing, a tick counts as consent only on rows created on or
after 30 June 2026. Option: a generated column `consented_at`
(`created_at` when ticked and from that date, else null), so the rule
lives in one place and the page can say "consented 12 Sep 2026" or
"ticked on a form that required it". The wordings above go in
`docs/data-protection.md`.

### Later: CiviCRM

Not built now, and there is no key yet; this phase leaves it room. When
it comes it adds the source `civicrm-import` and the three lists above.

- **Match**: contacts carry `external_identifier =
  airtable:Members:<recId>`, so `members.id` is the join, email
  the fallback. Option: a `civicrm_contact_id` column for a link.
- **Read**: API4 with a key the global team issue. `SubscriptionHistory`
  rows are dated events with IDs for `source_ref`; `is_opt_out` has no
  history, so `source_ref` is `<contact>:<first seen>`. `Removed` then
  `Added` lifts the opt-out (sets `resubscribed_at`). Only contacts we hold.
  Hourly, after this import.
- **Rule**: as the global team's, a `Removed` always wins; the source
  only adds opt-outs and lifts its own.

### Fallback: the mailing tools

Later work too. If no CiviCRM key comes, or its removals prove incomplete
(its import was add-only, matched by email, and stopped taking MailerLite
on 31 August 2026), read the tools directly. None of them still sends to
members, so a one-off import of each is enough:

- **MailerLite**, every newsletter unsubscribe until the move, dated:
  `GET /api/subscribers?filter[status]=unsubscribed`, or a one-off export
  of that segment. Source `mailerlite-import`, list `pauseai-updates`.
- **MailerSend**, unsubscribes and spam complaints from Airtable's
  automated welcomes: blocks, not opt-outs; `email_blocks` if anything.
- **MailChimp**: journalists only, out of scope.

Each is a one-off script in `scripts/` over an export, and a source line
in `docs/data-protection.md`.

## The import

`import-members` in `IMPORT_JOBS` and the `import_runs` CHECK, a card on
`/staff/import-data` with its page, a scheduled function every hour
like Luma's, at a different minute, the route `/api/cron/import-members`.
Hourly because the read is tiny and a new member or an opt-out should
reach the staff pages, and any later mailing, within the hour; nightly
would save nothing. The cost to watch is Airtable's monthly API call
quota, set by the global team's plan: 15 calls an hour is about 11,000 a
month, on top of the MP sync's. It reads
through `lib/server/outside-services/airtable.ts`, the one file allowed to
talk to Airtable, which gains the base, the table and `fetchMembers()`
with the fields whitelisted.

One run, one transaction:

1. **Fetch** every record matching the filter: 15 pages of 100 at 5
   requests a second, three seconds. A full read every run, no cursor, so
   a run is simple and self-correcting. If the base grows past about
   5,000 UK rows or the call quota bites, read only rows with
   `IS_AFTER({Last Modified}, <last run>)` and do a full read once a day
   to catch rows that stopped matching the filter.
2. **Upsert** on `id`, touching a row only when a value differs, so
   `changed_at` moves on real change. Skip `members_erased`. Email trimmed
   and lowercased.
3. **Mark removed** any member not in the set, and clear it when seen
   again: someone who moves abroad, unticks the share box or is merged
   stops being shown as a member; the row and links stay until erased, so
   the history does too. (Option: delete instead; the Luma import marks.)
4. **Opt-outs**, as above.
5. **Link supporters**.
6. Record `ok` with `{ members, added, changed, removed, optedOut,
   resubscribed, supportersAdded, linked }`, or `unchanged`. A failed
   request fails and rolls back the run, as the MP sync does.

## The source

**The dataset is membership, not Airtable.** Airtable holds it today and
CiviCRM is synced from it; the global team may make CiviCRM the
definitive copy, and then the import reads CiviCRM instead and the same
people are still members. So the names say what the rows are, not where
they came from: the table is `members`, the column `member_id`, the
source `member`, the job `import-members`. The key stays Airtable's
record ID, which CiviCRM keeps as each contact's external identifier
(`airtable:Members:<recId>`), so a row keeps its ID across the move. Only
the opt-out `source` names the system, `airtable-import`, because an
opt-out row records which import said so. Option: name them after
Airtable anyway and rename at the move.

`{ name: "member", column: "member_id", type: "text" }` in
`lib/server/supporter-sources.ts`, `"member"` in `SUPPORTER_SOURCES`. A
migration adds the column (`text UNIQUE REFERENCES members (id)
ON DELETE CASCADE`), widens the `CHECK` to three columns, and makes:

| View                        | Rows                                                                               |
| --------------------------- | ---------------------------------------------------------------------------------- |
| `supporter_source_member`   | `(id, email, name, joined_at)`                                                     |
| `supporter_activity_member` | `(id, joined_at, 'member-joined', NULL, source_page, <Airtable record URL>, NULL)` |
| `supporter_contact_member`  | `(id, joined_at, phone, postcode, NULL, NULL, city)`                               |

and their arms in the three union views and `supporters_summary`
(`CREATE OR REPLACE VIEW`; `sources` picks the new one up by itself).

**City, decided.** The contact shape gains `city text`: Luma's view gives
the event's city, letters `NULL`, members their own. The supporter's page
shows a City line, each value with its source and date like the other
contact details: a thousand members have a city and no postcode, so for
most of them it's the only place we know.

The activity's link opens the record in Airtable; staff without access
get Airtable's login page, which is fine.

## The staff pages

- **Badge**: Member, from `sources`, and beside it Volunteer or Lead when
  Intent says so (the wants-to-help half of the join form; "Keep
  informed", "Act now" and "None" get no badge). `supporters_summary`
  gains `intent`.
- **List**: Source gains Member. Option: a filter on intent, so staff
  can list everyone who wants to volunteer or lead.
- **Supporter's page**: a City line; "Joined PauseAI" in the history;
  "Member rec… · same email" in the links; and the mailing lists box
  below.
  **Decided:** the page says how they joined. The history line's detail
  is the source page, so it reads "Joined PauseAI · through pauseai.uk" or
  "· on pauseai.info/join", and a Joined line in the details says the
  same with the date and their intent ("Joined PauseAI 12 Sep 2026
  through pauseai.uk, wants to volunteer"); before September 2026 the site isn't recorded, so
  the line says "Joined PauseAI" alone. Option: add why the row is held
  ("shared with PauseAI UK on the join form" or "joined before the
  question was asked").
- **Mailing lists, decided**: the supporter's page shows every list
  the site knows, one line each, with the status and the reason for it.
  Phase 1 shows "Luma calendar emails: subscribed" or "unsubscribed 12
  Sep 2026"; that stays, with "via Luma" added as the reason. For
  members a second line, "PauseAI updates", reads one of:

  - "asked for updates when joining, 12 Sep 2026": ticked, row created
    on or after 30 June 2026.
  - "on the list from joining, 3 Mar 2026 (the form required it)" or "(the
    form didn't ask)": rows created before 30 June 2026, by date.
  - "opted out when joining, 12 Sep 2026 (left 'Keep me informed'
    unticked)": the import's opt-out in force.
  - "opted out when joining, then asked for updates on re-joining 3 Oct
    2026": the import's opt-out, lifted.

  Each line ends with the caveat, until the CiviCRM source exists:
  "unsubscribes made since, in CiviCRM, aren't known here". Nothing says
  plain "subscribed" for this list, since the site doesn't know. Once
  CiviCRM is read, its lists get lines of the same shape ("unsubscribed
  4 Oct 2026, via the email's unsubscribe link"), and the caveat goes.

  This needs `supporter_contact`-style facts the page doesn't have yet:
  the member row's `keep_informed`, `created_at` and the opt-out's
  `source`. The opt-out box is given each row's `source` and
  `resubscribed_at`, and the member's consent facts come from a
  `supporter_consent_member (id, keep_informed, created_at, ...)` view or
  straight from `members` by `member_id`. The history line for an opt-out
  ("Unsubscribed from PauseAI updates") gets the same reason as its
  detail, so the list of events reads the same way.

- **Supporters list**: the Mailing lists filter and Unsubscribed column
  gain PauseAI updates, so staff can list everyone who opted out when
  joining. The column shows the list names only; the reasons are on the
  person's page.
- **Dashboard**: "new supporters" counts them already. Option: "new
  members" as its own number, split by source page: through our site, or
  on pauseai.info.

## Erasure

`eraseSupporter()` deletes the member row (the link cascades), puts its ID
in `members_erased`, and counts it in the audit entry. `opt_outs` stays.
Passing erasure requests to and from the global team is outside this
change. Someone erased globally just vanishes from
the filter and is marked removed here; they're kept until a request names
them, since "gone from Airtable" also means "moved abroad".

## Data protection

Before anything is built:

- **`docs/data-protection.md`**, a row: name, email, phone, city,
  postcode, when and through which site they joined, what they said they
  wanted to do, the two consents, copied hourly from
  Stichting PauseAI's member database for UK members who shared their
  details or joined before that was asked. Condition: Article 9(2)(d) as
  members; the share box is the consent to the disclosure from Stichting
  PauseAI to us; for earlier members, that they joined the movement of
  which PauseAI UK is the chapter. Kept until erased or no longer shared.
  Stichting PauseAI is a separate controller, not our processor. The
  wordings of "Keep me informed" by date. Under Risks: an unsubscribe
  made in CiviCRM isn't known here until that source exists, met by
  nothing mailing members until it does.
- **The privacy policy**: the Supporters section says members' details
  come from Stichting PauseAI under the share box, and the page's first
  bullet, which sends all sign-up data to Stichting PauseAI's policy, says
  PauseAI UK holds a copy. Placeholder copy.
- **The global team's policy** says chapters receive members' details,
  as the form's wording has since September 2026.

## The fixtures

`tests/fixtures/staff-data.sql` is what `npm run db:reset` loads with
`DATA_FIXTURES=1`, what the storyboard runs on, and what
`scripts/fresh-database.test.ts` checks: every table has rows, supporters
are one per email with nothing unlinked, every job has a run in every
state, every dashboard number lands in both weeks. The rule at its top
holds for this phase too: every table has rows and every situation the
app knows has an example. So the fixture gains, all in the one file:

- **`members`** rows, by the same record IDs as the Airtable fixture
  below so an import rewrites rather than doubles them, plus made-up
  "seed" ones: a member who is also a Luma guest and a letter writer, so
  the summary shows `{letter,luma,member}` as well as `{member}` and the
  pairs; one with city and no postcode; one with a phone; one re-joined
  (`joined_at` before `created_at`); each intent, including null; each
  source page, including blank; one `removed_at` set; and the three
  consent shapes: ticked and created on or after 30 June 2026, ticked
  before it, unticked before it.
- **`members_erased`**: one ID, with no `members` row.
- **`opt_outs`**: a `pauseai-updates` row from `airtable-import` in
  force, and one lifted on a re-join (`resubscribed_at` set), beside the
  Luma ones. The fresh database test's `opted_out <> '{}'` check then
  covers both lists; add a check that both lists and both sources appear.
- **`supporter_links`** with `member_id`, made in the same CTE as the
  Luma and letter links, from the members' emails, so the "one supporter
  per email, nothing unlinked" check extends to members: add the
  `NOT EXISTS` check for `members` beside the two there.
- **`import_runs`** for `import-members`: ok, unchanged and failed, with
  the run's result shape, so the import page's card and the job's page
  have history. The test's job list gains `import-members`.
- **Dates** relative to `now()`, as the rest, with members joining in the
  last week and the week before, so the dashboard's "new supporters"
  moves in both.

`tests/fixtures/airtable-members.json` is the mocked Airtable answer in
`tests/fixtures/outside-services.ts`, the same records as the SQL's
fixture members by ID and field, so a storyboard run of the import on
the fixture database reports "unchanged", and a flow that first deletes
one shows it added. The erased ID is in the JSON and absent from the
SQL's `members`, so the import skipping it is driven too.

`scripts/fresh-database.test.ts` gets the new assertions above, and the
source list it expects becomes the six combinations present.

## Order of work

One commit each.

1. **Airtable read and fixtures**: `fetchMembers()`;
   `tests/fixtures/airtable-members.json` as "The fixtures" says; the
   route in `tests/fixtures/outside-services.ts`; a check that the
   fields fetched are the columns stored.
2. **Table and import**: migration, `lib/server/members-import.ts`, job,
   route, scheduled function, card; `staff-data.sql` gains the members,
   erased, opt-out and run rows and the fresh database test its checks.
   Storyboard: run it from the import page.
3. **The source**: migration for the column and views;
   `supporter-sources.ts`; badge; the pages' lines; the opt-outs;
   `staff-data.sql` links the members and the test checks none is left
   unlinked.
   Storyboard: a member who is also a letter writer; one who declined,
   shown as opted out; a re-join that ticked, lifting the opt-out.
4. **Erasure** of a member, through the next import. Storyboard: extend
   the erasure flow.
5. **Docs**, then delete this plan and `plans/supporters-and-luma.md`.

## What the data showed

As of 22 October 2026, from the Members table of `appWPTGqZmUcs3NWu`
(schema in `tmp/airtable/schema-appWPTGqZmUcs3NWu.json`), read with the
key in `tmp/env`. Counts only.

- 1,566 UK rows; 46 merged into another; 1,500 distinct emails. 100 rows
  with no country, 53 Ireland.
- Share permission ticked on 1,008: at most 3 a month through June 2026,
  then 70 of 70 in July, 82 of 88, 414 of 417, 436 of 446. The wording
  field exists from 12 September 2026 (408 rows).
- Email subscription ticked on 1,054: June 2025 76 of 113 (backfilled);
  July 2025 to January 2026 3 of 286; February to June 2026 134 of 146
  (required); from July 841 of 1,021.
- Joined: 2023 32, 2024 50, 2025 291, 2026 1,193.
- Phone 485; City 1,564 (454 spellings; London 358, Oxford 222); Zip code
  544, all full postcodes.
- Intent: Volunteer 777, None 396, Act now 345, Lead 48.
- Source page, filled from September 2026: pauseai.uk 562, pauseai.info/join
  258, pauseai.info/subscribe 26, pauseai.info 12, one each for
  /national-groups and a pauseai.uk deploy preview. Since September about
  two thirds of UK joins came through our embed. Signup source names the
  form ("June 2026 onboarding flow" 590, "October 2026 onboarding flow"
  397, the subscribe forms 36, blank 545) and Form version is 2 on 402
  rows; neither says which site.
- The Erasures table is empty. Nothing asks for a local group.

## Later, not in this change

- **Unsubscribes from CiviCRM**, once the global team issue a read key, or
  failing that MailerLite's unsubscribe export ("Later: CiviCRM" and
  "Fallback" above). Until then the site knows no member's unsubscribe,
  so nothing mails members. The other CiviCRM lists' names, and what to do
  with `do_not_email`, are settled then; this change creates only
  `pauseai-updates`.
- **Erasure requests** passed between us and the global team.
- **CiviCRM as the definitive copy of membership**, if the global team
  make it so: the import then reads CiviCRM, keyed by the same record IDs.
