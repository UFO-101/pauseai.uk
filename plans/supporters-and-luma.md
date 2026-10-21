# Supporters, the Luma import and unsubscribes

One staff page per supporter: the Luma events they registered for and what
they said when they did, whether they wrote to their MP, whether they are a
global PauseAI member, and whether they have unsubscribed. Built so more
sources can be added, and so we could later email people about events near
them.

Draft. Numbers are from the real data
("What the data showed", at the end).

## What we build

1. **A Luma webhook** at `/api/luma/webhook`, recording unsubscribes and
   resubscribes in an opt-out table any source can write to. Nothing reads
   it to stop email yet. It goes first because Luma only sends
   unsubscribes that happen after the webhook exists.
2. **A Luma import** of every public event on our calendar, its registered
   guests with their phone numbers and postcodes, and the calendar's contacts.
   Scheduled, idempotent, cheap when nothing has changed.
3. **Supporters**: a `supporters` table and a `supporter_links` table tying each source
   record (a Luma user, a letter) to one supporter, matched by email.
4. **Staff permissions**, so not every staff member sees people's data.
5. **Staff pages**: `/staff/supporters`, a filtered list, and
   `/staff/supporters/[id]`, one person's details and history.

Not yet: the global members as a source, email that respects opt-outs,
"events near you", anything public-facing.

Only supporters are in it: Luma guests and contacts, letter writers, and
later the UK members of the global database. Politicians stay in
`politicians`; journalists aren't covered. People Luma merely *invited* to an
event (an email blast) did nothing, and are 8,048 of its 11,845 guest rows,
so the import skips them.

The table is `supporters`, not `volunteers`: a member or a one-off letter
writer needn't be a volunteer.

## Data

We're the data controller for guests of events we host, so we keep what we
need, including phone numbers and postcodes. Raw payloads are never kept.

### Luma's own tables

Luma's data as Luma has it, keyed by Luma's IDs. Only the import writes to
them. Only public events are imported, as the site already shows only those
(`lib/server/outside-services/luma-calendar.ts`), so there's no visibility
column. Nobody has ever used Luma's check-in on our events, so there's no
check-in either: the pages say "registered", not "attended".

```sql
CREATE TABLE luma_events (
  id text PRIMARY KEY,                 -- Luma's evt-… ID
  name text NOT NULL,
  url text NOT NULL,
  start_at timestamptz NOT NULL,
  timezone text,
  location_type text,                  -- offline, online, …
  city text, region text, country text,
  latitude double precision, longitude double precision,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  changed_at timestamptz NOT NULL DEFAULT now(),
  guests_synced_at timestamptz,        -- last complete pass over its guest list
  guests_error text                    -- why the last pass failed, if it did
);
CREATE INDEX luma_events_start ON luma_events (start_at DESC);

-- One row per Luma user we've seen, as a guest or a calendar contact.
CREATE TABLE luma_people (
  user_id text PRIMARY KEY,            -- Luma's usr-… ID
  email text NOT NULL CHECK (email = lower(email)),
  name text NOT NULL DEFAULT '',
  contact_since timestamptz,           -- when they joined the calendar, if they're a contact
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX luma_people_email ON luma_people (email);

-- A guest who registered, asked to, was waitlisted or declined. Luma's
-- invited-only rows aren't imported.
CREATE TABLE luma_guests (
  id text PRIMARY KEY,                 -- Luma's gst-… ID
  event_id text NOT NULL REFERENCES luma_events (id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES luma_people (user_id) ON DELETE CASCADE,
  approval_status text NOT NULL CHECK (approval_status IN ('approved', 'pending_approval', 'waitlist', 'declined')),
  registered_at timestamptz NOT NULL,
  phone text,                          -- as given for this event; Luma gives E.164
  postcode text,                       -- their answer to a registration question whose label contains "postcode", as typed
  utm_source text,
  removed_at timestamptz,              -- gone from Luma's list at the last complete pass
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX luma_guests_user ON luma_guests (user_id, registered_at);
CREATE INDEX luma_guests_event ON luma_guests (event_id);

-- Luma users erased at their request ("Erasure"), whom the import never
-- brings back.
CREATE TABLE luma_erased (
  user_id text PRIMARY KEY,
  erased_at timestamptz NOT NULL
);
```

### Opt-outs, for any source

Keyed by address, not supporter, because an unsubscribe can arrive before
we know whose address it is.

```sql
-- Each time an address opted out of a list, and when it opted back in, if
-- it has. Open while resubscribed_at is null.
CREATE TABLE opt_outs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  address text NOT NULL CHECK (address = lower(address)),
  list text NOT NULL CHECK (list IN ('luma-calendar')),        -- later airtable-members
  source text NOT NULL CHECK (source IN ('luma-webhook')),     -- later airtable-import, staff
  source_ref text NOT NULL,            -- the source's ID for it (Luma's Webhook-Id), so a redelivery is a no-op
  unsubscribed_at timestamptz NOT NULL,
  resubscribed_at timestamptz,
  UNIQUE (source, source_ref)
);
CREATE UNIQUE INDEX opt_outs_open ON opt_outs (address, list) WHERE resubscribed_at IS NULL;
```

An address is opted out of a list while it has an open row; the partial
unique index allows one. Luma keeps no history, so only unsubscribes after
the webhook is set up are known. `send()` doesn't read `opt_outs` yet; when
the site mails supporters, each purpose names the lists that stop it and
`send()` checks them as it checks `email_blocks`.

### Supporters and their links

```sql
CREATE TABLE supporters (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Which supporter each source record belongs to. One row per record, through
-- a foreign key column for the record's table, so a link goes when its
-- record does.
CREATE TABLE supporter_links (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  supporter_id bigint NOT NULL REFERENCES supporters (id),
  luma_user_id text UNIQUE REFERENCES luma_people (user_id) ON DELETE CASCADE,
  letter_id bigint UNIQUE REFERENCES letters (id) ON DELETE CASCADE,
  -- later: airtable_member_id text UNIQUE REFERENCES airtable_members (id) ON DELETE CASCADE
  -- Why the record is this supporter's: the rule, and the value it matched on.
  matched_by text NOT NULL CHECK (matched_by IN ('email')),
  matched_value text NOT NULL,         -- the address, lowercased
  linked_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(luma_user_id, letter_id) = 1)
);
CREATE INDEX supporter_links_supporter ON supporter_links (supporter_id);
CREATE INDEX supporter_links_matched ON supporter_links (matched_by, matched_value);
```

A links table, not a `supporter_id` on each source table, keeps the source
tables exactly as the source has them. A new source adds a column and
widens the `CHECK`. `supporters` holds no name, email, phone
or location; they come from the linked records, newest name wins.

## The Luma import

A new job, `import-luma`, in `IMPORT_JOBS` and the `import_runs` CHECK, with
a box on `/staff/import-data` and a button to run it now. It runs hourly
(`0 * * * *`, staggered off the hour).

What it works within: Netlify scheduled functions stop after 30 seconds,
and the route they call, a synchronous function, after 60; neither can be
raised, so the run keeps inside the 30. Luma
allows 200 requests a minute, shared with the site's own calendar and
flyering tracker fetches, and answers 429 with `Retry-After: 60` beyond
that. Every response carries `x-ratelimit-remaining`. Every list is capped
at 50 a page. There's no "changed since" filter, so incremental means choosing
which events to look at. Both guest list paths return the same rows; the
import uses the documented `/v1/events/guests/list?event_id=`, and
`luma-guests.ts` moves to it in the same PR.

One run:

1. Take a Postgres advisory lock for `import-luma`; if held, stop.
2. **Events.** Page `/v1/calendars/events/list` (access manage and view,
   status approved), newest first, keeping `visibility = public`, through
   the calendar binding (`luma-calendar.ts`), which parses Luma's event into
   the site's `LumaEvent`; the import keeps those fields plus Luma's ID.
   Upsert each event. Stop at the first
   page with nothing new or changed. Once a night do a full pass (4 pages
   today), for edits to old events and deletions.
3. **Choose events to fetch guests for**, in this order, until the run has
   taken about 20 seconds or `x-ratelimit-remaining` on the last response
   is under 50, leaving that much of the minute for the site: live events
   (started less
   than 3 days ago, or not yet, and not synced in the last hour); never
   synced, newest first (the backfill); settled ones last synced within 3
   days of their start, or over 30 days ago.
4. **Guests of each chosen event**, every page in one go, skipping
   `invited` rows and users in `luma_erased`.
   Upsert people and guests, taking the postcode from an answer to a
   question whose label contains "postcode" (two events ask one today).
   Other answers aren't kept. A guest missing from a complete pass
   gets `removed_at`; seen again, loses it. Set `guests_synced_at` only on a
   complete pass; on failure set `guests_error` and send the event to the
   back of the queue.
5. **Contacts.** Page `/v1/calendars/contacts/list`, newest first, until a
   page holds nothing new, setting `contact_since`. A full pass weekly,
   spread over runs by a stored cursor. Every contact today is also a
   guest, so this adds join dates, not people.
6. **Link supporters** for anything new, in the same transaction.
7. Record `ok` with `{ events, guestsChanged, supportersAdded, linked,
   eventsLeft, requests }`, or `unchanged`. A 429 ends the run early and
   isn't a failure either.

Every write is an upsert on Luma's ID that touches a row only when a value
differs (`ON CONFLICT … DO UPDATE … WHERE (…) IS DISTINCT FROM (…)`), so
`changed_at` moves only on real change, a run cut short leaves nothing half
done, and a second run does nothing. The backfill is about 430 requests,
three hourly runs; after that a run is 4 pages of events plus a page or two
for each of the ~40 live events.

Events another calendar runs would come back as `access = view`. There are
none, and no UK group has its own calendar, so the import lists them like
any other and fetches no guests. We decide more if that changes.

Fixtures (`tests/fixtures/outside-services.ts`): events past, future and
private; guests across pages with postcodes, phones and invited rows;
contacts; a 429.

## The Luma webhook

`POST /api/luma/webhook`. Webhooks need Luma Plus, which the PauseAI UK
calendar has.

1. Verify the signature: `Webhook-Signature` is `t=<timestamp>,v1=<hex>`,
   the HMAC-SHA256 of `<timestamp>.<raw body>` with `LUMA_WEBHOOK_SECRET`,
   compared in constant time. 401 for a bad one or a timestamp over 5
   minutes old.
2. `calendar.person.unsubscribed`: insert an `opt_outs` row (`luma-calendar`,
   `luma-webhook`, `source_ref` the `Webhook-Id`, `ON CONFLICT DO NOTHING`
   because Luma redelivers). `calendar.person.subscribed`: set
   `resubscribed_at` on the address's open row, if any; otherwise nothing,
   as it's mostly first-time followers, whom the import already brings in.
   Any other type: nothing.
3. Answer 200 within Luma's 5 seconds; 500 on a database error so Luma
   retries (3 more times over 7 minutes).

The payload doesn't say whether it was an unsubscribe, a block or a spam
report. Later, `guest.registered` and `guest.updated` can upsert one guest
each, making the hourly run a safety net.

## Linking supporters

`linkSupporters(db)` in `lib/server/supporters.ts`, run at the end of each import and
after a letter is created. Set-based SQL.

1. Every source record with an email and no link is a candidate.
2. Trim and lowercase the email, nothing more: `jane+luma@` and `jane@` are
   different people.
3. If an existing link was matched on that email, link the candidate to
   its supporter, matched on the same.
4. Otherwise create a supporter and link every candidate with that email.

It only adds links, so re-running does nothing. A Luma user who changes
their email stays linked by user ID.

## A source, in general

Each source, in `lib/server/supporter-sources.ts`, gives its name (a
`SupporterSource` union member and its `supporter_links` column), its badge label
(copy, in `lib/content/staff-interface.ts`), and three SQL views:
`supporter_source_<name>` `(source_id, email, name, seen_at)` for the matcher;
`supporter_activity_<name>` `(source_id, at, kind, title, href)` for the
history; `supporter_contact_<name>` `(source_id, at, phone, postcode, latitude,
longitude)` for contact details and places, each with when it was given.
`supporter_activity` and `supporter_contact` union them all, joined to the links.

| Source | Activity | Contact details and places |
|---|---|---|
| luma | joined the calendar (`contact_since`); registered for an event (`registered_at`, event name, status) | phone and postcode per registration; the location of events registered for |
| letter | wrote to their MP (`created_at`: campaign, MP, status); MP replied (`replied_at`) | `sender_postcode` |
| (by address) | opted out (`unsubscribed_at`); opted back in (`resubscribed_at`) | |

`supporters_summary` is a view per supporter: name, emails, newest phone and
postcode, sources, first sign-up (the earliest activity from any source),
last activity, events registered, letters, opted out. Plain views over about
2,600 Luma users and 3,800 guest rows; a materialised view refreshed by the
import if that gets slow.

### The third source: the global members in Airtable

The global member database is the "Members & Actions" Airtable base, which
`AIRTABLE_TOKEN` already reads (CiviCRM is downstream of it). Its "Members"
table has 1,544 UK members, with email, name, phone, city, a "Zip code"
(524 have one), a join date from 2023 on, **"GDPR chapter share
permission"** (986 ticked: "Share your details with PauseAI UK? …"), which
is what lets us import them at all, and **"Email subscription"** (1,039
ticked), their consent to mail. The global team already erase (an
"Erasures" table).

Adding it: an `airtable_members` table and job copying UK members with the
share permission, its views and badge, its `supporter_links` column, and its
opt-outs as `opt_outs` rows (`airtable-members`, `airtable-import`).

### Ready for "events near you"

Not built, but the data is gathered: postcodes with dates, and events'
coordinates. Postcodes become coordinates through
`lib/server/outside-services/postcodes.ts`, cached. Open: which place counts
(newest postcode, or where they go to events); consent, which letter
writers give through the form's `contact_consent` checkbox and members
through "Email subscription", and Luma guests don't yet (likely one
standard registration question on every event, which the import would then
keep; until then postcodes are for staff to see, not for mailing); and who
sends, Luma's own blasts or `send()` honouring every
opt-out, or both.

## Erasure

When someone asks to be forgotten. Erasure is of a supporter, whatever
their sources: someone who only ever wrote a letter is a supporter too, and
a request arrives as an email address, which finds them. For each source
it deletes what that source holds: for a letter, the letter, its events
and the forwarded-reply sends to that address; for Luma, the person, their
guests and contact. What stays is what exists to stop us mailing the
address, the minimum to respect their wishes: `email_problems`,
`email_blocks`, `opt_outs`, and the audit log's block and unblock entries
that explain them. Every other audit entry about a supporter (viewing,
erasing) carries their ID, never a name or address, so it can stay too.
The ICO's rules apply: answer within a month; tell processors, so remove
them from our Luma contacts through Luma's API (documented) and ask Luma
about past guest lists (not documented); put backup copies beyond use,
which the backups' retention does (Netlify's 3 to 30 days, R2's 90) and
the privacy policy says; and record it, as an audit log entry with a
request reference and no email. The Airtable
"Web form emails" table holds a copy of every letter's sender, kept by the
policy team, so an erasure has to reach it by hand too.

Deleting here isn't enough on its own: the next Luma import copies the
person back. So their Luma user IDs go in `luma_erased`, which the import
skips. An
opaque ID identifies nobody without Luma's database, and it's the least we
can keep. If the same person later registers with a new Luma account they
come back as a new supporter, which is fine: they've re-engaged, and that's
new data. Campaign and event counts drop by one per erasure.

Not chosen: blocking a keyed hash of the email, which catches the new
Luma account at the cost of keeping an email-derived value and matching by
email in the import; and anonymising in place with nullable columns and an
`erased_at` on each table, which keeps counts exact at the cost of the most
code and "erased" rows in every staff page.

### Political opinions

Who registered for a PauseAI protest or wrote to their MP under a PauseAI
campaign reveals a political opinion, so this is special category data
under UK GDPR. The condition that fits is Article 9(2)(d): a not-for-profit
body with a political aim processing its members and "persons who have
regular contact with it", with no disclosure outside the body without
consent. That needs no appropriate policy document, but it does need:

- a record of processing naming the condition, the categories, the
  processors (Luma, Postmark, Netlify, Cloudflare) and retention, in
  `docs/`, and a DPIA of a page since the ICO says do one if in doubt;
- no disclosure outside PauseAI UK without consent, which is what the
  global database's "share your details with PauseAI UK" checkbox is for in
  phase 2, and what any sharing the other way would need;
- security in proportion: the `supporters` permission, audit-logged viewing,
  and erasure;
- the privacy policy saying so ("The privacy policy").

### The privacy policy

`/privacy` covers donations and analytics and points everything else at
Stichting PauseAI's policy. It doesn't mention what the site already does
with personal data, let alone what this plan adds. It needs to cover all of
it: what we hold and why (for supporters, the Article 9(2)(d) condition),
who processes it, how long we keep it, and how to ask for erasure. The
words are someone's to write; this is what they must cover.

What the site does today:

- **Email your MP.** The form takes name, email, address and postcode, and
  the consent checkbox ("Tell me about events where I can talk to my MP and
  ways to help PauseAI", stored as `contact_consent`). The postcode goes to
  postcodes.io to find the constituency, and the form is guarded by
  Cloudflare Turnstile. We keep the letter's sender details, subject,
  campaign, MP and status, but not its text. Postmark sends it to the MP
  from a reply address of ours; an MP's reply is forwarded to the sender
  through Postmark, and we keep that it happened and who replied, not the
  reply. Bounces and spam complaints are kept against the address so we
  don't mail it again. The policy team keeps a copy of each letter's
  sender, subject and message in Airtable ("Web form emails").
- **Events near you.** A postcode typed on the home page or kept from the
  letter goes to postcodes.io; the browser keeps it in session storage. We
  store nothing.
- **Analytics.** Google Analytics, only after consent, with a cookie that
  remembers the choice.
- **Donations.** Stripe, on its own pages; the policy already covers it.
- **Staff.** Login links and sessions for pauseai.uk addresses, and an
  audit log of what staff did.
- **Backups.** Netlify keeps the database for 3 to 30 days by plan;
  our nightly dump in Cloudflare R2 for 90 days.

What this plan adds: Luma registrations and calendar contacts (name, email,
phone, postcode, which events), opt-outs, supporter pages for staff, the
supporters permission, and erasure. In phase 2, the global members.

## Staff permissions

Logging in stays as it is: any pauseai.uk address. What changes is that
seeing supporters needs a permission, and so does granting permissions.

```sql
CREATE TABLE staff_permissions (
  email text PRIMARY KEY CHECK (email = lower(email)),
  permissions text[] NOT NULL CHECK (permissions <@ ARRAY['admin', 'supporters']),
  granted_by text NOT NULL,            -- the admin who last changed them
  granted_at timestamptz NOT NULL DEFAULT now()
);
```

`admin@pauseai.uk` is built in with every permission, so there is an admin
before the table has a row. `supporters` lets you see supporters; `admin`
lets you grant and revoke, on `/staff/permissions`. The other staff pages
are unchanged. After login, `/staff` shows the sections you have; with no
permissions it says so and whom to ask. Every grant and revocation is an
audit log entry, as is viewing a supporter's page.
`requireStaff(permission)` takes the permission a page needs.

## Staff pages

### The sidebar

The staff pages get a left sidebar in place of the bar of links, with the
pages in groups and the current one marked, and the page taking the rest of
the width (no `container` on `StaffPage`). On a phone it collapses to the
dropdown the bar has today. A group shows only to those with its
permission.

- **Supporters**: the list, a supporter
- **Politicians**: the list, a politician
- **Letters**
- **Email**: blocked emails
- **Data**: import, import history
- **Admin**: permissions, audit log

`StaffHeader` becomes `StaffNav`, with a gallery example. Every staff flow's
frames change, so it's reviewed on both viewports, tablet width included,
before anything is built on it.

### The supporter pages

Behind `requireStaff("supporters")`, `noindex`. Filters parsed in
`lib/staff-search.ts`, the supporter found with `found(getSupporter(id))`.

**`/staff/supporters`**: a paged table, newest activity first. Columns: name,
email (and "+N"), badges, first sign-up, last activity, events registered,
letters, opt-outs (the lists any of their addresses is opted out of, blank
when none). Badges as `Tag`s: Luma (contact), Registered N, Wrote to MP;
later Member. Filters, in the URL like the other staff pages:
name, email or phone; source; registered at least once; last active within
30 days, 90 days, a year, or longer; first sign-up from and to; unsubscribed;
has a postcode. Sort by last activity, first sign-up or name.

**`/staff/supporters/[id]`**: name; every email, phone and postcode with where
and when it came from; each link and why ("same email foo@bar.com"); badges; and a list of every mailing list
we know of, one per `opt_outs` list (today `luma-calendar`), saying for each
of the supporter's addresses whether it is opted out, since when, and from
what source. Past opt-outs that were resubscribed appear in the activity.
Activity as one dated list, newest first, each item linking to the Luma
event, the letter on `/staff/letters` or the MP's page. The letters page
links each sender to their supporter.

## Order of work

### Phase 1: Luma

One commit each.

1. **Webhook and opt-outs**, first because every day before it's live
   loses unsubscribes. Migration, route, signature check,
   `LUMA_WEBHOOK_SECRET` in `.env.example` and the deploy notes. Once
   deployed, in Luma: the PauseAI UK calendar, Settings → Developer →
   Webhooks, a webhook for this URL with Calendar Person Unsubscribed and
   Subscribed; its `whsec_` secret into Netlify as `LUMA_WEBHOOK_SECRET`.
   Then test it for real: unsubscribe a staff address from the calendar's
   emails and see its `opt_outs` row appear; subscribe again and see whether
   Luma sends `subscribed` and the row closes, since the docs don't say.
2. **Luma import.** Migration, job, route, scheduled function, import page
   box, fixtures. Storyboard: run it from the staff page.
3. **Staff permissions.** Migration, `requireStaff(permission)`,
   `/staff/permissions`, the line on `/staff`, audit log entries.
4. **The sidebar.** `StaffNav`, groups by permission, the wide page, gallery
   example, every staff flow re-reviewed.
5. **Supporters and linking.** Migration, source views, `linkSupporters`
   wired into the import and letter creation, and a one-off pass over
   existing records.
6. **Staff pages.** Both pages, filters, gallery examples, storyboard flows
   (filter, open a supporter, see their history, be refused without the
   permission).
7. **Erasure**, as a staff action on the supporter's page, with the Luma
   contact removal and `luma_erased`.
8. **Docs.** `docs/domain-concepts.md`: a "Supporters" section in place of
   "Senders, and people generally", and "Opt-outs".
   `docs/development.md`: webhook setup. The record of processing and the
   DPIA ("Political opinions"). The privacy policy, with placeholder copy
   until it's written.

### Phase 2: Airtable

The global members as a source ("The third source"). It needs speccing
first: which members (the share permission, the country, duplicates and
merged rows), which fields, what an unticked "Email subscription" means,
and whether second addresses link too. Then roughly: the `airtable_members`
table and nightly job; the `airtable_member_id` column, views, badge and
opt-outs; the staff pages; docs. Delete this plan at the end.

## What the data showed

As of 21 October 2026.

- **Events.** 185 on one calendar, all ours; 182 public; 38 in the future.
  The list includes each event's registration questions; 9 events have
  any, 34 questions in all, none asked twice. Two ask for a postcode; none
  for a phone, a local group or consent.
- **Guests.** 11,845 rows for 2,617 users: 8,048 invited (no
  `registered_at`), 3,500 approved, 289 declined, 8 pending or waitlisted.
  The biggest event has 2,454 rows. No check-ins anywhere. 153 rows have a
  phone, all E.164. 676 have answers, each
  `{ question_id, label, question_type, answer }`.
- **Contacts.** 2,433, every one also a guest: `user_id`, email, name,
  `created_at`.
- **API.** Both guest paths return the same rows. Pages cap at 50. Reading
  everything took 428 requests and one 429.
- **Airtable.** "UK Politicians": MPs, 733 web form letters, and a
  hand-made export of one Luma event's guests used to chase MP meetings,
  the kind of work these pages replace. "Members & Actions": the global
  member database.

Still to check: whether Luma lets us remove a guest from a past event, for
erasure; that `admin@pauseai.uk` is a mailbox someone reads.
