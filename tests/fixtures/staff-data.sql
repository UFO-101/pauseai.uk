-- Fake data for a development database, so every staff page has something
-- on it without importing anything: scripts/db-reset.mjs loads this with
-- DATA_FIXTURES=1 (addFixtureData in scripts/fresh-database.mjs). Every
-- table has rows, and every situation the app knows has an example. Dates
-- are relative to now(), so the dashboard's last week and the week before
-- each hold something whenever it's loaded, and each number differs
-- between the two.
--
-- The six people, the ten events and the first guests are the Luma
-- fixtures' (luma-*.json), and the two MPs Airtable's (airtable-mps.json),
-- by the same IDs, so an import writes the same rows again rather than
-- doubling them. The rest are made up, with "seed" in their IDs. The
-- letters go to the test MPs (lib/test-mps.json), which must be in the
-- database already, and most recent ones then to Airtable's two. Supporters and their links are written at the end as
-- the matcher (lib/server/supporters.ts) would make them: one per email,
-- then one per UK mobile number.

-- ---------------------------------------------------------------- staff

-- The migration's admin; someone who may see supporters, logged in on two
-- devices, one session kept; someone with an account alone, who has never
-- logged in; and someone removed last month.
INSERT INTO staff_accounts (email, permissions, added_by, added_at, last_login_at, last_seen_at) VALUES
  ('jo@pauseai.uk', '{supporters}', 'admin@pauseai.uk', now() - interval '40 days', now() - interval '3 hours', now() - interval '20 minutes'),
  ('samuel.whitlock@pauseai.uk', '{}', 'admin@pauseai.uk', now() - interval '6 days', NULL, NULL);
INSERT INTO staff_sessions (token_hash, email, created_at, expires_at, remember, user_agent) VALUES
  ('seed-session-jo-kept', 'jo@pauseai.uk', now() - interval '3 days', now() + interval '27 days', true,
   'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15'),
  ('seed-session-jo-phone', 'jo@pauseai.uk', now() - interval '3 hours', now() + interval '21 hours', false,
   'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'),
  ('seed-session-jo-old', 'jo@pauseai.uk', now() - interval '20 days', now() - interval '19 days', false, NULL);
INSERT INTO staff_login_links (token_hash, email, browser_hash, created_at, expires_at, used_at, remember) VALUES
  ('seed-link-used', 'jo@pauseai.uk', 'seed-browser', now() - interval '3 days', now() - interval '3 days' + interval '15 minutes', now() - interval '3 days' + interval '2 minutes', true),
  ('seed-link-expired', 'samuel.whitlock@pauseai.uk', 'seed-browser', now() - interval '1 day', now() - interval '1 day' + interval '15 minutes', NULL, false);

-- ---------------------------------------------------------- politicians

-- Airtable's politicians, as the sync copies them (airtable-politicians.json,
-- by the same IDs): three MPs, one an important target with notes; an MSP, a
-- personal connection; one who retired and one who left office. Then a peer
-- the signatory import added, whom the sync takes to be Airtable's; a peer
-- who died; and an MP whose record is gone from Airtable, kept. Then made-up
-- ones for every other body, varying in party, status, markers and whether
-- we have an address, with accents to search for.
CREATE TEMP TABLE seed_politicians (airtable_id text, house text, name text, salutation text, constituency text, party text, country text, email text, status text, notes text, important boolean, connection boolean, removed interval, created interval, updated interval);
INSERT INTO seed_politicians VALUES
  ('recDummy', 'commons', 'Ms Dora Dummy', 'Ms Dummy', 'Hackney North and Stoke Newington', 'Labour', 'england', 'mp90001.office@parliament.uk', 'in_office', '', false, false, NULL, '60 days', '60 days'),
  ('recPlaceholder', 'commons', 'Polly Placeholder', 'Ms Placeholder', 'Cities of London and Westminster', 'Labour (Co-op)', 'england', 'polly.placeholder.mp@parliament.uk', 'in_office', E'Met at the example fair.\nRecommended', true, false, NULL, '60 days', '9 days'),
  ('recMorag', 'scottish-parliament', 'Morag Example', 'Ms Example', 'Exampleshire North', 'Example Party', 'scotland', 'morag.example.msp@parliament.example', 'in_office', '', false, true, NULL, '40 days', '40 days'),
  ('recRetired', 'commons', 'Rita Retired', 'Ms Retired', 'Old Seat', 'Independent', 'wales', NULL, 'retired', '', false, false, NULL, '40 days', '40 days'),
  ('recMo', 'commons', 'Mo Example', 'Mx Example', 'Manchester Central', 'Labour', 'england', 'mp90003.office@parliament.uk', 'in_office', '', false, false, NULL, '60 days', '60 days'),
  ('recGone', 'commons', 'Gordon Gone', 'Mr Gone', 'Former Seat', 'Independent', 'england', 'gordon.gone.mp@parliament.uk', 'left_office', '', false, false, NULL, '60 days', '20 days'),
  (NULL, 'lords', 'Lord Seedling of Example', 'Lord Seedling', NULL, 'Crossbench', NULL, NULL, 'in_office', '', false, false, NULL, '30 days', '12 days'),
  ('recDeparted', 'lords', 'Lord Departed of Example', 'Lord Departed', NULL, 'Crossbench', NULL, NULL, 'died', '', false, false, NULL, '40 days', '25 days'),
  ('recRemoved', 'commons', 'Rob Removed', 'Mr Removed', 'Removed Seat', 'Example Party', 'england', 'rob.removed.mp@parliament.uk', 'in_office', '', false, false, '6 days', '40 days', '6 days'),
  ('recSeedBaroness', 'lords', 'Baroness Sample of Testwick', 'Baroness Sample', NULL, 'Conservative', NULL, 'sampleb@parliament.example', 'in_office', 'Spoke in the AI debate.', true, false, NULL, '30 days', '30 days'),
  ('recSeedAngus', 'scottish-parliament', 'Angus Placeholder', 'Mr Placeholder', 'Glen Example', 'Scottish National Party', 'scotland', 'angus.placeholder.msp@parliament.example', 'retired', '', false, false, NULL, '50 days', '50 days'),
  ('recSeedSian', 'senedd', 'Siân Enghraifft', 'Ms Enghraifft', 'Ceredigion Example', 'Plaid Cymru', 'wales', 'sian.enghraifft.ms@senedd.example', 'in_office', 'Writes back in Welsh.', false, true, NULL, '45 days', '10 days'),
  ('recSeedDafydd', 'senedd', 'Dafydd Dummy', 'Mr Dummy', 'Cardiff Example', 'Welsh Labour', 'wales', 'dafydd.dummy.ms@senedd.example', 'in_office', '', true, false, NULL, '45 days', '45 days'),
  ('recSeedRhys', 'senedd', 'Rhys Ymadawedig', 'Mr Ymadawedig', 'Old Valley', 'Welsh Conservatives', 'wales', NULL, 'left_office', '', false, false, NULL, '70 days', '70 days'),
  ('recSeedAoife', 'ni-assembly', 'Aoife Ó Sampla', 'Ms Ó Sampla', 'Belfast Example', 'Sinn Féin', 'northern-ireland', 'aoife.osampla.mla@niassembly.example', 'in_office', '', false, false, NULL, '35 days', '35 days'),
  ('recSeedWilliam', 'ni-assembly', 'William Example', 'Mr Example', 'Lagan Example', 'DUP', 'northern-ireland', NULL, 'in_office', '', true, true, NULL, '35 days', '35 days'),
  ('recSeedMayor', 'other', 'Mayor Mo Mockup', 'Mayor Mockup', 'Greater Example', 'Labour', 'england', 'mayor@greaterexample.example', 'in_office', 'Metro mayor.', false, false, NULL, '25 days', '25 days'),
  ('recSeedCllr', 'other', 'Cllr Fiona Fixture', 'Cllr Fixture', 'Example Ward', 'Green', 'england', 'fiona.fixture@council.example', 'in_office', '', false, false, '3 days', '25 days', '3 days');
WITH people AS (
  INSERT INTO notable_people (kind, airtable_id, name, salutation, email, status, notes, important_target, personal_connection, airtable_removed_at, created_at, updated_at)
  SELECT 'politician', airtable_id, name, salutation, email, status, notes, important, connection, now() - removed, now() - created, now() - updated
  FROM seed_politicians RETURNING id, name
)
INSERT INTO politicians (id, house, constituency, party, country)
SELECT p.id, s.house, s.constituency, s.party, s.country FROM people p JOIN seed_politicians s USING (name);
DROP TABLE seed_politicians;

-- Made-up politicians, enough for 250 with the test MPs, so the list has
-- three pages: mostly MPs, then peers and members of the other bodies, each
-- with a party of their body; a few retired or gone, a few marked, a few
-- with no address. Not Airtable's, so a sync leaves them be: the made-up
-- record ID only joins each to its row here.
CREATE TEMP TABLE made_politicians AS
SELECT i, 'recMade' || i AS airtable_id,
  (ARRAY['Alex','Bea','Cal','Dee','Eli','Fay','Gus','Hal','Ivy','Jon','Kit','Lou','Mo','Ned','Ola','Pip','Quin','Ros','Sid','Tess','Uma','Viv','Wes','Zoe'])[1 + i % 24] AS first,
  (ARRAY['Abbott','Barker','Carter','Dalton','Ellis','Fenwick','Garner','Hollis','Ingram','Jarvis','Keller','Lister','Marsh','Norris','Oakley','Parry','Quayle','Rowe','Slater','Thorne','Upton','Vance','Webb','Yates'])[1 + (i / 24 + 5 * i) % 24] AS last,
  (ARRAY['Ashford','Bramley','Colton','Dunmore','Eastwick','Farley','Glenholm','Harwood','Inverby','Kelso','Langley','Morden','Northam','Oxley','Penrith','Rydal','Stanmore','Tarleton','Westby','Yarrow'])[1 + (i * 3) % 20] AS town,
  -- A peer's territorial title, a place of its own: the town above repeats
  -- every 20, which would give peers the same names.
  CASE WHEN i % 10 IN (6, 7) THEN (ARRAY['Ashford','Bramley','Colton','Dunmore','Eastwick','Farley','Glenholm','Harwood','Inverby','Kelso','Langley','Morden','Northam','Oxley','Penrith','Rydal','Stanmore','Tarleton','Westby','Yarrow'])[1 + (i / 10 * 2 + i % 10 - 6 + i / 20) % 20] END AS seat,
  CASE WHEN i % 10 < 6 THEN 'commons' WHEN i % 10 < 8 THEN 'lords' WHEN i % 10 = 8 THEN 'scottish-parliament' WHEN i % 20 = 9 THEN 'senedd' ELSE 'ni-assembly' END AS house
FROM generate_series(1, 227) i;
WITH people AS (
  INSERT INTO notable_people (kind, airtable_id, name, salutation, email, status, notes, important_target, personal_connection, created_at, updated_at)
  SELECT 'politician', airtable_id,
    CASE WHEN house = 'lords' THEN (CASE WHEN i % 4 = 0 THEN 'Baroness ' ELSE 'Lord ' END) || last || ' of ' || seat ELSE first || ' ' || last END,
    CASE WHEN house = 'lords' THEN (CASE WHEN i % 4 = 0 THEN 'Baroness ' ELSE 'Lord ' END) || last ELSE (CASE WHEN i % 2 = 0 THEN 'Ms ' ELSE 'Mr ' END) || last END,
    CASE WHEN i % 9 = 0 THEN NULL ELSE lower(first || '.' || last || '.' || i) || '@parliament.example' END,
    CASE WHEN i % 15 = 0 THEN 'retired' WHEN i % 23 = 0 THEN 'left_office' ELSE 'in_office' END,
    '', i % 17 = 0, i % 19 = 0, now() - make_interval(days => 10 + i % 50), now() - make_interval(days => i % 10)
  FROM made_politicians RETURNING id, airtable_id
)
INSERT INTO politicians (id, house, constituency, party, country)
SELECT p.id, m.house,
  CASE WHEN m.house = 'lords' THEN NULL ELSE m.town || ' ' || (ARRAY['North','South','East','West','Central','and District'])[1 + m.i % 6] END,
  CASE m.house
    WHEN 'commons' THEN (ARRAY['Labour','Conservative','Liberal Democrat','Reform UK','Green','Scottish National Party','Independent'])[1 + m.i % 7]
    WHEN 'lords' THEN (ARRAY['Crossbench','Conservative','Labour','Liberal Democrat'])[1 + m.i % 4]
    WHEN 'scottish-parliament' THEN (ARRAY['Scottish National Party','Scottish Labour','Scottish Conservatives'])[1 + m.i % 3]
    WHEN 'senedd' THEN (ARRAY['Plaid Cymru','Welsh Labour','Welsh Conservatives'])[1 + m.i % 3]
    ELSE (ARRAY['DUP','Sinn Féin','Alliance','SDLP'])[1 + m.i % 4]
  END,
  CASE m.house
    WHEN 'commons' THEN (ARRAY['england','england','england','scotland','wales','northern-ireland'])[1 + m.i % 6]
    WHEN 'lords' THEN NULL
    WHEN 'scottish-parliament' THEN 'scotland'
    WHEN 'senedd' THEN 'wales'
    ELSE 'northern-ireland'
  END
FROM people p JOIN made_politicians m USING (airtable_id);
UPDATE notable_people SET airtable_id = NULL WHERE airtable_id IN (SELECT airtable_id FROM made_politicians);
DROP TABLE made_politicians;

-- An ask staff added, which no one has answered, so it can be changed or deleted.
INSERT INTO asks (slug, title, kind, date, url, asked_by) VALUES
  ('winter-reception-dec-2026', 'Winter reception', 'event', '2026-12-09', NULL, '{pauseai}');

-- Statuses: Polly signed the letter to the PM last month; Dora this week;
-- the peer backs the bill, from ControlAI's letter, the week before; Backy
-- McTestface MP's bill status (lib/test-mps.json) was already there. Then
-- Airtable's, as the sync sets them: each letter and the statement, and every answer an event
-- allows, across the conference and Go to Parliament, all there when the
-- sync first copied each ask, 20 days ago, so dated the ask's day, or that
-- day if the ask's is still to come.
INSERT INTO ask_statuses (notable_person_id, ask, ask_kind, status, status_date, note, updated_by, updated_at)
SELECT id, 'frontier-ai-letter', 'letter', 'signed', (now() - interval '35 days')::date, 'Told us at the march', 'jo@pauseai.uk', now() - interval '34 days' FROM notable_people WHERE airtable_id = 'recPlaceholder';
INSERT INTO ask_statuses (notable_person_id, ask, ask_kind, status, status_date, note, updated_by, updated_at)
SELECT id, 'frontier-ai-letter', 'letter', 'signed', (now() - interval '2 days')::date, '', 'samuel.whitlock@pauseai.uk', now() - interval '2 days' FROM notable_people WHERE airtable_id = 'recDummy';
INSERT INTO ask_statuses (notable_person_id, ask, ask_kind, status, status_date, note, updated_by, updated_at)
SELECT id, 'controlai-letter', 'letter', 'signed', '2026-09-11', '', 'controlai', now() - interval '10 days' FROM notable_people WHERE name = 'Lord Seedling of Example';
INSERT INTO ask_statuses (notable_person_id, ask, ask_kind, status, status_date, note, updated_by, updated_at)
SELECT id, 'controlai-letter', 'letter', 'signed', (now() - interval '3 days')::date, '', 'jo@pauseai.uk', now() - interval '3 days' FROM politicians WHERE test_postcode = 'ZZ99ZZ';
INSERT INTO ask_statuses (notable_person_id, ask, ask_kind, status, status_date, note, updated_by, updated_at)
SELECT id, 'frontier-ai-letter', 'letter', 'signed', (now() - interval '1 day')::date, 'Confirmed by their office', 'jo@pauseai.uk', now() - interval '1 day' FROM politicians WHERE test_postcode = 'ZZ99ZH';
INSERT INTO ask_statuses (notable_person_id, ask, ask_kind, status, status_date, updated_by, updated_at)
SELECT n.id, a.ask, a.kind, a.status, least(k.date, (now() - interval '20 days')::date), 'airtable', now() - interval '20 days'
FROM (VALUES
  ('recPlaceholder', 'controlai-statement', 'letter', 'signed'),
  ('recPlaceholder', 'edinburgh-conference-2026', 'event', 'declined'),
  ('recPlaceholder', 'go-to-parliament-oct-2026', 'event', 'meeting_staff'),
  ('recDummy', 'go-to-parliament-oct-2026', 'event', 'going'),
  ('recDummy', 'edinburgh-conference-2026', 'event', 'tentative'),
  ('recGone', 'go-to-parliament-oct-2026', 'event', 'declined_surgery'),
  ('recRemoved', 'go-to-parliament-oct-2026', 'event', 'tentative_staff'),
  ('recMorag', 'edinburgh-conference-2026', 'event', 'going'),
  ('recDeparted', 'edinburgh-conference-2026', 'event', 'passed_on'),
  ('recDeparted', 'deepmind-letter', 'letter', 'signed'),
  ('recRetired', 'frontier-ai-letter', 'letter', 'signed')
) AS a (airtable_id, ask, kind, status) JOIN notable_people n USING (airtable_id) JOIN asks k ON k.slug = a.ask;

-- ----------------------------------------------------------------- luma

-- The fixture calendar's ten events, past and future, and two more.
INSERT INTO luma_events (id, name, url, start_at, access, city, latitude, longitude, first_seen_at, changed_at, guests_synced_at, guests_error) VALUES
  ('evt-fixture-past-glasgow-stall', 'Glasgow street stall', 'https://luma.com/fixture-past-glasgow-stall', now() - interval '270 days', 'manage', 'Glasgow', 55.8617, -4.2583, now() - interval '30 days', now() - interval '30 days', now() - interval '1 hour', NULL),
  ('evt-fixture-past-london-march', 'PauseAI London March', 'https://luma.com/fixture-past-london-march', now() - interval '250 days', 'manage', 'London', 51.5045, -0.1262, now() - interval '30 days', now() - interval '30 days', now() - interval '1 hour', NULL),
  ('evt-seed-manchester-talk', 'AI and jobs: a talk in Manchester', 'https://luma.com/seed-manchester-talk', now() - interval '12 days', 'manage', 'Manchester', 53.4794, -2.2453, now() - interval '30 days', now() - interval '12 days', now() - interval '1 hour', NULL),
  ('evt-seed-online-training', 'Lobbying your MP (online training)', 'https://luma.com/seed-online-training', now() - interval '4 days', 'manage', NULL, NULL, NULL, now() - interval '30 days', now() - interval '4 days', now() - interval '1 hour', NULL),
  ('evt-fixture-london-protest', 'PauseAI London: Protest at Parliament', 'https://luma.com/fixture-london-protest', now() + interval '20 days', 'manage', 'London', 51.5007, -0.1268, now() - interval '30 days', now() - interval '1 day', now() - interval '1 hour', NULL),
  ('evt-fixture-online-intro', 'Introduction to PauseAI UK (online)', 'https://luma.com/fixture-online-intro', now() + interval '22 days', 'manage', NULL, NULL, NULL, now() - interval '30 days', now() - interval '5 days', now() - interval '1 hour', NULL),
  ('evt-fixture-manchester-social', 'PauseAI Manchester Social', 'https://luma.com/fixture-manchester-social', now() + interval '25 days', 'manage', 'Manchester', 53.4794, -2.2453, now() - interval '30 days', now() - interval '5 days', now() - interval '1 hour', NULL),
  ('evt-fixture-scotland-meeting', 'PauseAI Scotland Meeting', 'https://luma.com/fixture-scotland-meeting', now() + interval '28 days', 'manage', NULL, NULL, NULL, now() - interval '30 days', now() - interval '5 days', NULL, NULL),
  ('evt-fixture-oxford-talk', 'AI risk talk', 'https://luma.com/fixture-oxford-talk', now() + interval '30 days', 'manage', 'Oxford', 51.7548, -1.2544, now() - interval '30 days', now() - interval '5 days', NULL, NULL),
  ('evt-fixture-bristol-leafleting', 'Leafleting in Bristol', 'https://luma.com/fixture-bristol-leafleting', now() + interval '32 days', 'manage', 'Bristol', 51.4545, -2.5879, now() - interval '30 days', now() - interval '5 days', NULL, NULL),
  ('evt-fixture-leicester-meetup', 'PauseAI Leicester meetup', 'https://luma.com/fixture-leicester-meetup', now() + interval '36 days', 'manage', 'Leicester', 52.6369, -1.1398, now() - interval '30 days', now() - interval '5 days', NULL, NULL),
  ('evt-seed-view-only', 'A partner''s event we can only view', 'https://luma.com/seed-view-only', now() + interval '15 days', 'view', 'Leeds', 53.8008, -1.5491, now() - interval '30 days', now() - interval '5 days', now() - interval '1 hour', 'Luma answered 403: guests are not shared with viewers');

-- The fixture's six people and fourteen more. Those with contact_since
-- follow the calendar's emails; one of them is also erased (luma_erased), so
-- the import skips them.
INSERT INTO luma_people (user_id, email, name, contact_since, changed_at) VALUES
  ('usr-fixture-1', 'jane.fixture@example.com', 'Jane Fixture', now() - interval '31 days', now() - interval '1 day'),
  ('usr-fixture-2', 'sam.fixture@example.com', 'Sam Fixture', NULL, now() - interval '1 day'),
  ('usr-fixture-3', 'alex.fixture@example.com', 'Alex Fixture', now() - interval '20 days', now() - interval '1 day'),
  ('usr-fixture-4', 'declined.fixture@example.com', 'Dee Clined', NULL, now() - interval '1 day'),
  ('usr-fixture-5', 'pat.fixture@example.com', 'Pat Fixture', NULL, now() - interval '1 day'),
  ('usr-fixture-6', 'follower.fixture@example.com', 'Fay Follower', now() - interval '80 days', now() - interval '1 day'),
  ('usr-seed-7', 'omar.seed@example.com', 'Omar Seed', now() - interval '3 days', now() - interval '1 day'),
  ('usr-seed-8', 'priya.seed@example.com', 'Priya Seed', now() - interval '2 days', now() - interval '1 day'),
  ('usr-seed-9', 'tom.seed@example.com', 'Tom Seed', NULL, now() - interval '1 day'),
  ('usr-seed-10', 'li.seed@example.com', 'Li Seed', now() - interval '9 days', now() - interval '1 day'),
  ('usr-seed-11', 'grace.seed@example.com', 'Grace Seed', NULL, now() - interval '1 day'),
  ('usr-seed-12', 'ahmed.seed@example.com', 'Ahmed Seed', now() - interval '11 days', now() - interval '1 day'),
  ('usr-seed-13', 'rosa.seed@example.com', 'Rosa Seed', NULL, now() - interval '1 day'),
  ('usr-seed-14', 'ben.seed@example.com', 'Ben Seed', NULL, now() - interval '1 day'),
  ('usr-seed-15', 'yuki.seed@example.com', 'Yuki Seed', now() - interval '50 days', now() - interval '1 day'),
  ('usr-seed-16', 'noah.seed@example.com', 'Noah Seed', NULL, now() - interval '1 day'),
  ('usr-seed-17', 'ines.seed@example.com', 'Ines Seed', NULL, now() - interval '1 day'),
  ('usr-seed-18', 'kwame.seed@example.com', 'Kwame Seed', now() - interval '6 days', now() - interval '1 day'),
  ('usr-seed-19', 'mia.seed@example.com', 'Mia Seed', NULL, now() - interval '1 day'),
  ('usr-seed-20', 'erased.seed@example.com', 'Erin Erased', now() - interval '70 days', now() - interval '1 day'),
  -- Following since an hour ago: after Luma's webhook went live in a database
  -- made now, so we'd email her (lib/email-permissions.ts); the others
  -- followed before it, so we can't be sure.
  ('usr-seed-21', 'nia.seed@example.com', 'Nia Seed', now() - interval '1 hour', now() - interval '1 hour');
INSERT INTO luma_erased (user_id, erased_at) VALUES ('usr-seed-20', now() - interval '15 days');
INSERT INTO luma_import_state (list, full_pass_at, cursor) VALUES
  ('events', now() - interval '1 hour', ''),
  ('contacts', now() - interval '3 days', 'seed-cursor-page-4');

-- Registrations: a few long ago, nine in the week before last, six in the
-- last week (approved and not removed, as the dashboard counts them), plus
-- a waitlist, a decline, one awaiting approval and one removed.
INSERT INTO luma_guests (id, event_id, user_id, approval_status, registered_at, phone, postcode, utm_source, removed_at, changed_at) VALUES
  -- long ago
  ('gst-1', 'evt-fixture-past-london-march', 'usr-fixture-1', 'approved', now() - interval '260 days', '+447700900001', 'M1 1AE', 'brixton', NULL, now() - interval '30 days'),
  ('gst-2', 'evt-fixture-past-london-march', 'usr-fixture-2', 'approved', now() - interval '258 days', NULL, NULL, 'stratford', NULL, now() - interval '30 days'),
  ('gst-3', 'evt-fixture-past-glasgow-stall', 'usr-fixture-3', 'approved', now() - interval '275 days', NULL, 'G1 1AA', 'brixton', NULL, now() - interval '30 days'),
  ('gst-seed-yuki-march', 'evt-fixture-past-london-march', 'usr-seed-15', 'approved', now() - interval '255 days', NULL, 'SE1 7PB', NULL, NULL, now() - interval '30 days'),
  ('gst-seed-erased-march', 'evt-fixture-past-london-march', 'usr-seed-20', 'approved', now() - interval '255 days', NULL, NULL, NULL, now() - interval '15 days', now() - interval '15 days'),
  -- the Manchester talk, 12 days ago: the week before last
  ('gst-seed-7-talk', 'evt-seed-manchester-talk', 'usr-seed-7', 'approved', now() - interval '13 days', '+447700900007', 'M4 1HQ', 'instagram', NULL, now() - interval '12 days'),
  ('gst-seed-8-talk', 'evt-seed-manchester-talk', 'usr-seed-8', 'approved', now() - interval '13 days', NULL, 'M20 2RN', 'instagram', NULL, now() - interval '12 days'),
  ('gst-seed-9-talk', 'evt-seed-manchester-talk', 'usr-seed-9', 'approved', now() - interval '12 days', NULL, NULL, NULL, NULL, now() - interval '12 days'),
  ('gst-seed-10-talk', 'evt-seed-manchester-talk', 'usr-seed-10', 'approved', now() - interval '12 days', NULL, 'SK4 1AA', 'poster', NULL, now() - interval '12 days'),
  ('gst-seed-11-talk', 'evt-seed-manchester-talk', 'usr-seed-11', 'approved', now() - interval '11 days', NULL, NULL, NULL, NULL, now() - interval '11 days'),
  ('gst-seed-12-talk', 'evt-seed-manchester-talk', 'usr-seed-12', 'approved', now() - interval '11 days', '+447700900012', 'M1 1AE', NULL, NULL, now() - interval '11 days'),
  ('gst-seed-13-training', 'evt-seed-online-training', 'usr-seed-13', 'approved', now() - interval '10 days', NULL, NULL, 'newsletter', NULL, now() - interval '10 days'),
  ('gst-seed-14-training', 'evt-seed-online-training', 'usr-seed-14', 'approved', now() - interval '9 days', NULL, 'BS1 1AA', 'newsletter', NULL, now() - interval '9 days'),
  ('gst-seed-3-training', 'evt-seed-online-training', 'usr-fixture-3', 'approved', now() - interval '8 days', NULL, 'G1 1AA', NULL, NULL, now() - interval '8 days'),
  -- the last week: the protest and the intro
  ('gst-fixture-1-protest', 'evt-fixture-london-protest', 'usr-fixture-1', 'approved', now() - interval '6 days', '+447700900001', 'm1 1ae', 'brixton', NULL, now() - interval '6 days'),
  ('gst-5', 'evt-fixture-london-protest', 'usr-fixture-5', 'approved', now() - interval '5 days', '+447700900005', NULL, NULL, NULL, now() - interval '5 days'),
  ('gst-seed-16-protest', 'evt-fixture-london-protest', 'usr-seed-16', 'approved', now() - interval '4 days', NULL, 'E1 6AN', 'tiktok', NULL, now() - interval '4 days'),
  ('gst-seed-17-protest', 'evt-fixture-london-protest', 'usr-seed-17', 'approved', now() - interval '3 days', NULL, NULL, 'tiktok', NULL, now() - interval '3 days'),
  ('gst-seed-18-intro', 'evt-fixture-online-intro', 'usr-seed-18', 'approved', now() - interval '2 days', NULL, NULL, NULL, NULL, now() - interval '2 days'),
  ('gst-seed-19-intro', 'evt-fixture-online-intro', 'usr-seed-19', 'approved', now() - interval '1 day', NULL, 'LS1 1AA', NULL, NULL, now() - interval '1 day'),
  -- not counted: declined, waitlisted, awaiting approval, removed
  ('gst-4', 'evt-fixture-london-protest', 'usr-fixture-4', 'declined', now() - interval '5 days', NULL, NULL, 'brixton', NULL, now() - interval '5 days'),
  ('gst-fixture-2-intro', 'evt-fixture-online-intro', 'usr-fixture-2', 'waitlist', now() - interval '3 days', NULL, NULL, NULL, NULL, now() - interval '3 days'),
  ('gst-seed-9-protest', 'evt-fixture-london-protest', 'usr-seed-9', 'pending_approval', now() - interval '1 day', NULL, NULL, NULL, NULL, now() - interval '1 day'),
  ('gst-seed-11-protest', 'evt-fixture-london-protest', 'usr-seed-11', 'approved', now() - interval '4 days', NULL, NULL, NULL, now() - interval '2 days', now() - interval '2 days');

-- Opt-outs: two in the last week, one the week before, one long ago; Sam
-- unsubscribed and then subscribed again.
INSERT INTO opt_outs (address, list, source, source_ref, unsubscribed_at, resubscribed_at) VALUES
  ('pat.fixture@example.com', 'luma-calendar', 'luma-webhook', 'seed-unsubscribe-pat', now() - interval '2 days', NULL),
  ('tom.seed@example.com', 'luma-calendar', 'luma-webhook', 'seed-unsubscribe-tom', now() - interval '5 days', NULL),
  ('yuki.seed@example.com', 'luma-calendar', 'luma-webhook', 'seed-unsubscribe-yuki', now() - interval '10 days', NULL),
  ('erased.seed@example.com', 'luma-calendar', 'luma-webhook', 'seed-unsubscribe-erased', now() - interval '60 days', NULL),
  ('sam.fixture@example.com', 'luma-calendar', 'luma-webhook', 'seed-unsubscribe-sam', now() - interval '20 days', now() - interval '17 days'),
  -- Gone from Luma's list of contacts with no webhook, as after a removal: the contacts pass noticed.
  ('ahmed.seed@example.com', 'luma-calendar', 'luma-contacts', 'usr-seed-12 seed-pass', now() - interval '1 day', NULL);

-- -------------------------------------------------------------- members

-- The members airtable-members.json holds, by the same IDs and, at
-- FIXTURE_NOW, the same values, so an import there changes nothing; and one
-- gone from it, marked removed. Jane, Tom and Lee are also a Luma guest or a
-- letter writer. Kit ticked "Keep me informed" when the form required it,
-- Tom before it had the box, and Lee left it unticked then; Owen left it
-- unticked when it was a choice, so is opted out of the updates; Rhea did
-- too on an earlier record, and ticked it on re-joining, which lifted that.
INSERT INTO members (id, email, name, phone, city, postcode, joined_at, created_at, keep_informed, share_permission, source_page, intent, source_modified_at, first_seen_at, changed_at, removed_at) VALUES
  ('recMemberJane', 'jane.fixture@example.com', 'Jane Fixture', NULL, 'Manchester', 'M1 1AE', '2026-09-12T10:00:00Z', '2026-09-12T10:00:00Z', true, true, 'pauseai.uk', 'Volunteer', '2026-09-12T10:00:00Z', '2026-09-12T10:05:00Z', '2026-09-12T10:05:00Z', NULL),
  ('recMemberMara', 'mara.member@example.com', 'Mara Member', '+447700900123', 'London', NULL, now() - interval '3 days 2 hours 30 minutes', now() - interval '3 days 2 hours 30 minutes', true, true, 'pauseai.info/join', 'Lead', now() - interval '3 days 2 hours 29 minutes', now() - interval '3 days 2 hours', now() - interval '3 days 2 hours', NULL),
  ('recMemberOwen', 'owen.member@example.com', 'Owen Member', NULL, 'Bristol', NULL, now() - interval '9 days 22 hours', now() - interval '9 days 22 hours', false, true, 'pauseai.uk', 'Act now', now() - interval '9 days 22 hours', now() - interval '9 days 21 hours', now() - interval '9 days 21 hours', NULL),
  ('recMemberRhea', 'rhea.member@example.com', 'Rhea Member', NULL, 'Cardiff', NULL, '2026-07-10T00:00:00Z', now() - interval '5 days 4 hours', true, true, 'pauseai.info/subscribe', 'Keep informed', now() - interval '5 days 4 hours', now() - interval '5 days 3 hours', now() - interval '5 days 3 hours', NULL),
  ('recMemberKit', 'kit.member@example.com', 'Kit Member', NULL, 'Oxford', 'OX1 1AA', '2026-03-03T18:00:00Z', '2026-03-03T18:00:00Z', true, false, NULL, 'Volunteer', '2026-08-29T17:33:10Z', '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z', NULL),
  ('recMemberTom', 'tom.seed@example.com', 'Tom Seed', '+447700900456', 'London', NULL, '2024-11-03T00:00:00Z', '2025-06-06T06:18:44Z', true, false, NULL, NULL, '2026-08-29T17:33:12Z', '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z', NULL),
  ('recMemberLee', 'lee.letter@example.com', 'Lee Letter', NULL, 'Bristol', 'BS1 1AA', '2025-11-29T21:06:16Z', '2025-11-29T21:06:16Z', false, false, NULL, 'None', '2026-08-29T17:33:13Z', '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z', NULL),
  ('recMemberGil', 'gil.member@example.com', 'Gil Member', NULL, 'Leeds', 'LS1 1AA', '2026-08-01T12:00:00Z', '2026-08-01T12:00:00Z', true, true, 'pauseai.uk', 'Act now', '2026-08-01T12:00:00Z', '2026-09-01T00:00:00Z', now() - interval '2 days', now() - interval '2 days');
-- Erin, erased with her Luma user (the audit log's erasure), is still in
-- Airtable's table: the import skips her.
INSERT INTO members_erased (id, erased_at) VALUES ('recMemberErased', now() - interval '15 days');

-- --------------------------------------------------------------- places

-- Where postcodes.io placed the postcodes and towns above, as the hourly
-- lookup stores them; the test postcodes it doesn't know.
INSERT INTO postcode_places (postcode, latitude, longitude, place, country) VALUES
  ('BS11AA', 51.4545, -2.5879, 'Bristol, City of', 'england'),
  ('E16AN', 51.5205, -0.0726, 'Tower Hamlets', 'england'),
  ('E151AA', 51.5413, -0.0039, 'Newham', 'england'),
  ('EC1A1BB', 51.5202, -0.0978, 'City of London', 'england'),
  ('G11AA', 55.8609, -4.249, 'Glasgow City', 'scotland'),
  ('HU11AA', 53.7443, -0.3326, 'Kingston upon Hull, City of', 'england'),
  ('LE11AA', 52.6345, -1.13, 'Leicester', 'england'),
  ('LS11AA', 53.797, -1.5492, 'Leeds', 'england'),
  ('LS27EY', 53.8079, -1.5566, 'Leeds', 'england'),
  ('M11AE', 53.4794, -2.2353, 'Manchester', 'england'),
  ('M41HQ', 53.484, -2.237, 'Manchester', 'england'),
  ('M202RN', 53.4317, -2.2303, 'Manchester', 'england'),
  ('NR11AA', 52.6286, 1.2925, 'Norwich', 'england'),
  ('OX11AA', 51.752, -1.2577, 'Oxford', 'england'),
  ('SE17PB', 51.5007, -0.1167, 'Lambeth', 'england'),
  ('SK41AA', 53.4106, -2.1575, 'Stockport', 'england'),
  ('YO17HH', 53.9617, -1.0817, 'York', 'england'),
  ('SW1A1AA', 51.501009, -0.141588, 'Westminster', 'england'),
  ('ZZ99ZB', NULL, NULL, NULL, NULL),
  ('ZZ99ZH', NULL, NULL, NULL, NULL),
  ('ZZ99ZN', NULL, NULL, NULL, NULL),
  ('ZZ99ZS', NULL, NULL, NULL, NULL),
  ('ZZ99ZZ', NULL, NULL, NULL, NULL);
-- And each one's constituency, where a fixture MP has it.
UPDATE postcode_places SET constituency_checked = true,
  constituency = CASE postcode WHEN 'EC1A1BB' THEN 'Cities of London and Westminster' WHEN 'M11AE' THEN 'Manchester Central' END;
INSERT INTO named_places (name, latitude, longitude, place, country) VALUES
  ('manchester', 53.4794, -2.2453, 'Manchester', 'england'),
  ('london', 51.5072, -0.1276, 'London', 'england'),
  ('bristol', 51.4545, -2.5879, 'Bristol', 'england'),
  ('cardiff', 51.4816, -3.1791, 'Cardiff', 'wales'),
  ('oxford', 51.752, -1.2577, 'Oxford', 'england'),
  ('leeds', 53.7997, -1.5492, 'Leeds', 'england'),
  ('glasgow', 55.8642, -4.2518, 'Glasgow', 'scotland'),
  ('leicester', 52.6369, -1.1398, 'Leicester', 'england');
-- The calendar's tags: big days and online events, which say nothing of where people live.
UPDATE luma_events SET tags = '{Big events,London}' WHERE id IN ('evt-fixture-past-london-march', 'evt-fixture-london-protest');
UPDATE luma_events SET tags = '{Online}' WHERE id IN ('evt-seed-online-training', 'evt-fixture-online-intro');
UPDATE luma_events SET tags = '{Scotland}' WHERE id IN ('evt-fixture-past-glasgow-stall', 'evt-fixture-scotland-meeting');
UPDATE luma_events SET tags = '{Manchester}' WHERE id IN ('evt-seed-manchester-talk', 'evt-fixture-manchester-social');
UPDATE luma_events SET tags = '{Oxford}' WHERE id = 'evt-fixture-oxford-talk';
UPDATE luma_events SET tags = '{West of England}' WHERE id = 'evt-fixture-bristol-leafleting';
UPDATE luma_events SET tags = '{Leicester}' WHERE id = 'evt-fixture-leicester-meetup';

-- -------------------------------------------------------------- letters

-- Letters to the test MPs in every state. Seven sent in the last week and
-- four the week before; two replied to this week and three the week before;
-- one bounce this week and two the week before. reply_hash doubles as a
-- handle for the rows below.
CREATE TEMP TABLE seed_letters (hash text, postcode text, campaign text, sender text, email text, address text, sender_postcode text, consent boolean, subject text, status text, created interval, sent interval, replied interval) ON COMMIT DROP;
INSERT INTO seed_letters VALUES
  -- long ago
  ('old-jane', 'ZZ99ZZ', 'regulate-letter-pm', 'Jane Fixture', 'Jane.Fixture@example.com', '1 Fixture Street, Manchester', 'M1 1AE', true, 'Please back a pause on frontier AI', 'sent', '45 days', '45 days', '38 days'),
  ('old-yuki', 'ZZ99ZS', 'regulate-letter-pm', 'Yuki Seed', 'yuki.seed@example.com', '2 Seed Row, London', 'SE1 7PB', true, 'A pause before it''s too late', 'sent', '40 days', '40 days', NULL),
  ('old-gone', 'ZZ99ZZ', 'regulate-letter-pm', 'Priya Seed', 'priya.seed@example.com', '3 Seed Row, Manchester', 'M20 2RN', false, 'Frontier AI needs rules', 'sent', '30 days', '30 days', '27 days'),
  -- the week before last: four sent, three replied, two bounced
  ('prev-lee', 'ZZ99ZS', 'regulate-letter-pm', 'Lee Letter', 'lee.letter@example.com', '2 Fixture Road, Bristol', 'BS1 1AA', false, 'AI safety matters to your constituents', 'sent', '13 days', '13 days', '11 days'),
  ('prev-omar', 'ZZ99ZB', 'support-sobel-bill', 'Omar Seed', 'omar.seed@example.com', '4 Seed Row, Manchester', 'M4 1HQ', true, 'Back the Sobel bill', 'sent', '12 days', '12 days', '9 days'),
  ('prev-li', 'ZZ99ZZ', 'regulate-letter-pm', 'Li Seed', 'li.seed@example.com', '5 Seed Row, Stockport', 'SK4 1AA', true, 'Please support a pause', 'sent', '11 days', '11 days', '8 days'),
  ('prev-ahmed', 'ZZ99ZB', 'support-sobel-bill', 'Ahmed Seed', 'ahmed.seed@example.com', '6 Seed Row, Manchester', 'M1 1AE', false, 'The Sobel bill deserves your vote', 'sent', '9 days', '9 days', NULL),
  ('prev-bounce-1', 'ZZ99ZH', 'regulate-letter-pm', 'Bo Bounce', 'bo.bounce@example.com', '3 Fixture Lane, Leeds', 'LS1 1AA', true, 'Please support a pause', 'bounced', '12 days', '12 days', NULL),
  ('prev-bounce-2', 'ZZ99ZH', 'support-sobel-bill', 'Rosa Seed', 'rosa.seed@example.com', '7 Seed Row, Norwich', 'NR1 1AA', true, 'Back the bill', 'bounced', '10 days', '10 days', NULL),
  -- the last week: seven sent, two replied, one bounced, one not sent, one still sending, one complained about
  ('week-sam', 'ZZ99ZB', 'support-sobel-bill', 'Sam Fixture', 'sam.fixture@example.com', '4 Fixture Way, Stratford', 'E15 1AA', true, 'Back the Sobel bill', 'sent', '6 days', '6 days', '4 days'),
  ('week-ben', 'ZZ99ZZ', 'regulate-letter-pm', 'Ben Seed', 'ben.seed@example.com', '8 Seed Row, Bristol', 'BS1 1AA', true, 'A pause on frontier AI', 'sent', '6 days', '6 days', NULL),
  ('week-grace', 'ZZ99ZS', 'regulate-letter-pm', 'Grace Seed', 'grace.seed@example.com', '9 Seed Row, Oxford', 'OX1 1AA', false, 'Please act on AI risk', 'sent', '5 days', '5 days', '2 days'),
  ('week-kwame', 'ZZ99ZZ', 'regulate-letter-pm', 'Kwame Seed', 'kwame.seed@example.com', '10 Seed Row, Leicester', 'LE1 1AA', true, 'Regulate AI developers now', 'sent', '4 days', '4 days', NULL),
  ('week-mia', 'ZZ99ZB', 'support-sobel-bill', 'Mia Seed', 'mia.seed@example.com', '11 Seed Row, Leeds', 'LS1 1AA', true, 'Support the bill', 'sent', '3 days', '3 days', NULL),
  ('week-ines', 'ZZ99ZS', 'regulate-letter-pm', 'Ines Seed', 'ines.seed@example.com', '12 Seed Row, London', 'E1 6AN', false, 'AI and our future', 'sent', '2 days', '2 days', NULL),
  ('week-noah', 'ZZ99ZZ', 'regulate-letter-pm', 'Noah Seed', 'noah.seed@example.com', '13 Seed Row, London', 'E1 6AN', true, 'A pause, please', 'sent', '1 day', '1 day', NULL),
  ('week-bounce', 'ZZ99ZH', 'regulate-letter-pm', 'Cass Seed', 'cass.seed@example.com', '14 Seed Row, Leeds', 'LS2 7EY', true, 'Please support a pause', 'bounced', '3 days', '3 days', NULL),
  ('week-nora', 'ZZ99ZN', 'regulate-letter-pm', 'Nora Noaddress', 'nora@example.com', '5 Fixture Close, Norwich', 'NR1 1AA', false, 'A pause on frontier AI', 'not_sent', '2 days', NULL, NULL),
  ('week-sending', 'ZZ99ZZ', 'regulate-letter-pm', 'Sal Sending', 'sal.sending@example.com', '15 Seed Row, Hull', 'HU1 1AA', true, 'Regulate AI', 'sending', '20 minutes', NULL, NULL),
  ('week-spam', 'ZZ99ZS', 'regulate-letter-pm', 'Grumpy Gus', 'grumpy@example.com', '16 Seed Row, York', 'YO1 7HH', false, 'Stop AI', 'spam_complaint', '5 days', '5 days', NULL);
CREATE TEMP TABLE seeded_letters ON COMMIT DROP AS
SELECT nextval(pg_get_serial_sequence('letters', 'id')) AS id, s.* FROM seed_letters s;
INSERT INTO letters (id, kind, notable_person_id, status, created_at, sent_at, replied_at) OVERRIDING SYSTEM VALUE
SELECT s.id, 'supporter', p.id, s.status, now() - s.created, now() - s.sent + interval '4 seconds', now() - s.replied
FROM seeded_letters s JOIN politicians p ON p.test_postcode = s.postcode;
-- Each sender is a form entry with their letter's ID.
INSERT INTO form_entries (id, form, created_at, name, email, address, postcode, contact_consent) OVERRIDING SYSTEM VALUE
SELECT s.id, 'email-your-mp', l.created_at, s.sender, s.email, s.address, s.sender_postcode, s.consent
FROM seeded_letters s JOIN letters l ON l.id = s.id;
INSERT INTO letters_from_supporters (id, entry_id, campaign, subject, reply_hash)
SELECT s.id, s.id, s.campaign, s.subject, 'seed-' || s.hash FROM seeded_letters s JOIN letters l ON l.id = s.id;
-- Most of the recent letters went to Airtable's two MPs, so the dashboard,
-- which leaves the test MPs out, counts them; the bounces stay on Bouncy's.
UPDATE letters SET notable_person_id = (SELECT id FROM notable_people WHERE airtable_id = 'recDummy')
WHERE id IN (SELECT id FROM letters_from_supporters WHERE reply_hash IN ('seed-prev-lee', 'seed-prev-li', 'seed-week-ben', 'seed-week-kwame', 'seed-week-noah'));
UPDATE letters SET notable_person_id = (SELECT id FROM notable_people WHERE airtable_id = 'recPlaceholder')
WHERE id IN (SELECT id FROM letters_from_supporters WHERE reply_hash IN ('seed-prev-omar', 'seed-week-sam', 'seed-week-grace', 'seed-week-mia'));
-- The seed letters, with their handles.
CREATE TEMP VIEW seed_letter_rows AS SELECT l.*, s.reply_hash FROM letters l JOIN letters_from_supporters s USING (id) WHERE s.reply_hash LIKE 'seed-%';

-- Their history: sending, then sent, then what followed.
INSERT INTO letter_events (letter_id, at, status, details) SELECT id, created_at, 'sending', '{}' FROM seed_letter_rows WHERE true;
INSERT INTO letter_events (letter_id, at, status, details) SELECT id, sent_at, 'sent', jsonb_build_object('messageId', 'seed-message-' || id) FROM seed_letter_rows WHERE sent_at IS NOT NULL;
INSERT INTO letter_events (letter_id, at, status, details) SELECT id, created_at + interval '1 second', 'not_sent', '{"reason": "The MP has no email address"}' FROM seed_letter_rows WHERE status = 'not_sent';
INSERT INTO letter_events (letter_id, at, status, details) SELECT id, replied_at, 'replied', jsonb_build_object('from', 'The office of ' || (SELECT name FROM notable_people WHERE id = notable_person_id)) FROM seed_letter_rows WHERE replied_at IS NOT NULL;
INSERT INTO letter_events (letter_id, at, status, details) SELECT id, sent_at + interval '2 minutes', 'auto_reply', '{"from": "Backy McTestface MP", "subject": "Out of office"}' FROM seed_letter_rows WHERE reply_hash IN ('seed-prev-ahmed', 'seed-week-mia');
INSERT INTO letter_events (letter_id, at, status, details) SELECT id, sent_at + interval '1 minute', 'bounced', '{"type": "HardBounce", "description": "The address does not exist"}' FROM seed_letter_rows WHERE status = 'bounced';
INSERT INTO letter_events (letter_id, at, status, details) SELECT id, sent_at + interval '3 hours', 'spam_complaint', '{"type": "SpamComplaint"}' FROM seed_letter_rows WHERE status = 'spam_complaint';

-- Every email that went out, or didn't: the letters, two forwarded replies,
-- staff login links, a bounce alert; one refused by a block, one that failed.
INSERT INTO email_sends (at, purpose, letter_id, address, outcome, message_id)
SELECT sent_at, 'letter', id, (SELECT coalesce(email, '') FROM notable_people WHERE id = notable_person_id), 'sent', 'seed-message-' || id FROM seed_letter_rows WHERE sent_at IS NOT NULL;
INSERT INTO email_sends (at, purpose, letter_id, address, outcome, message_id)
SELECT replied_at + interval '1 minute', 'forwarded-reply', id, 'replies@pauseai.uk', 'sent', 'seed-forward-' || id FROM seed_letter_rows WHERE replied_at IS NOT NULL AND reply_hash IN ('seed-week-sam', 'seed-week-grace');
INSERT INTO email_sends (at, purpose, letter_id, address, outcome, message_id) VALUES
  (now() - interval '3 days', 'staff-login', NULL, 'jo@pauseai.uk', 'sent', 'seed-login-jo'),
  (now() - interval '1 day', 'staff-login', NULL, 'samuel.whitlock@pauseai.uk', 'sent', 'seed-login-sam'),
  (now() - interval '3 days' + interval '5 minutes', 'staff-alert', NULL, 'admin@pauseai.uk', 'sent', 'seed-alert-bounce'),
  (now() - interval '1 day', 'letter', NULL, 'no-such-mailbox@pauseai.uk', 'refused', NULL),
  (now() - interval '8 days', 'letter', NULL, 'polly.placeholder.mp@parliament.uk', 'failed', NULL);

-- Delivery problems: the bounces that blocked Bouncy's address, a soft
-- bounce that blocked nothing, a complaint that blocked the sender, and a
-- block from the week before last on an MP's old address, bouncing an email
-- the site has no record of sending, so of no type we know.
INSERT INTO email_problems (id, at, address, message_id, kind, reason, can_reset, details) OVERRIDING SYSTEM VALUE VALUES
  (1, now() - interval '12 days' + interval '1 minute', 'no-such-mailbox@pauseai.uk', NULL, 'hard', 'The address does not exist', true, '{"type": "HardBounce"}'),
  (2, now() - interval '10 days' + interval '1 minute', 'no-such-mailbox@pauseai.uk', NULL, 'hard', 'The address does not exist', true, '{"type": "HardBounce"}'),
  (3, now() - interval '9 days', 'gordon.gone.mp@parliament.uk', 'not-sent-by-the-site', 'hard', 'Mailbox closed', true, '{"type": "HardBounce"}'),
  (4, now() - interval '5 days' + interval '3 hours', 'grumpy@example.com', NULL, 'complaint', 'Marked as spam', false, '{"type": "SpamComplaint"}'),
  (5, now() - interval '4 days', 'polly.placeholder.mp@parliament.uk', NULL, 'soft', 'Mailbox full', true, '{"type": "SoftBounce"}'),
  (6, now() - interval '3 days' + interval '1 minute', 'no-such-mailbox@pauseai.uk', NULL, 'hard', 'The address does not exist', true, '{"type": "HardBounce"}');
UPDATE email_problems p SET message_id = 'seed-message-' || l.id FROM seed_letter_rows l WHERE l.reply_hash = 'seed-prev-bounce-1' AND p.id = 1;
UPDATE email_problems p SET message_id = 'seed-message-' || l.id FROM seed_letter_rows l WHERE l.reply_hash = 'seed-prev-bounce-2' AND p.id = 2;
UPDATE email_problems p SET message_id = 'seed-message-' || l.id FROM seed_letter_rows l WHERE l.reply_hash = 'seed-week-spam' AND p.id = 4;
UPDATE email_problems p SET message_id = 'seed-message-' || l.id FROM seed_letter_rows l WHERE l.reply_hash = 'seed-week-bounce' AND p.id = 6;
-- Blocked: Bouncy's address by the first bounce, Gordon's by his, Gus by his
-- complaint. Polly's soft bounce blocked nothing.
INSERT INTO email_blocks (address, problem_id) VALUES
  ('no-such-mailbox@pauseai.uk', 1),
  ('gordon.gone.mp@parliament.uk', 3),
  ('grumpy@example.com', 4);

-- --------------------------------------------- letters from Airtable

-- Letters supporters sent through pauseai.info's old form, as the one-off
-- import copies them (airtable-web-form.json): to the letter to the PM, with
-- consent; to the liability letter, before the form asked, so no; and to the
-- DeepMind letter, saying no. No address, and no address of their own.
CREATE TEMP TABLE seed_web_form (airtable_id text, politician text, campaign text, sender text, email text, postcode text, consent boolean, subject text, sent interval) ON COMMIT DROP;
INSERT INTO seed_web_form VALUES
  ('recWebWendyFrontier', 'recPlaceholder', 'pauseai-info-frontier-ai', 'Wendy Webform', 'Wendy.Webform@example.com', 'EC1A 1BB', true, 'Please sign the letter on frontier AI', '31 days'),
  ('recWebWendyLiability', 'recDummy', 'pauseai-info-liability', 'Wendy Webform', 'wendy.webform@example.com', 'EC1A 1BB', false, 'AI companies should be liable', '450 days'),
  ('recWebDee', 'recDeparted', 'pauseai-info-deepmind', 'Dee Deepmind', 'dee.deepmind@example.com', 'M1 1AE', false, 'Dear Sir Demis', '460 days');
CREATE TEMP TABLE seeded_web_form ON COMMIT DROP AS
SELECT nextval(pg_get_serial_sequence('letters', 'id')) AS id, w.* FROM seed_web_form w;
INSERT INTO letters (id, kind, notable_person_id, status, created_at, sent_at) OVERRIDING SYSTEM VALUE
SELECT w.id, 'supporter', n.id, 'sent', now() - w.sent, now() - w.sent + interval '1 minute'
FROM seeded_web_form w JOIN notable_people n ON n.airtable_id = w.politician;
INSERT INTO form_entries (id, form, created_at, name, email, postcode, contact_consent) OVERRIDING SYSTEM VALUE
SELECT w.id, 'web-form', l.created_at, w.sender, w.email, w.postcode, w.consent FROM seeded_web_form w JOIN letters l ON l.id = w.id;
INSERT INTO letters_from_supporters (id, entry_id, campaign, subject, airtable_id)
SELECT w.id, w.id, w.campaign, w.subject, w.airtable_id FROM seeded_web_form w JOIN letters l ON l.id = w.id;
SELECT setval(pg_get_serial_sequence('form_entries', 'id'), (SELECT max(id) FROM form_entries));

-- ---------------------------------------------------- march sign-ups

-- Two sign-ups for the march, as the route keeps them: Ben, who also wrote
-- to his MP, came by the newsletter's link, ticked the box and is on Luma's
-- list; Mo came by no link, didn't tick it, and Luma skipped them.
WITH entries AS (
  INSERT INTO form_entries (form, created_at, name, email, phone, city, postcode, contact_consent, utm_source) VALUES
    ('march-2026-11', now() - interval '2 days', 'Ben Seed', 'ben.seed@example.com', '07700 900111', 'Bristol', 'BS1 1AA', true, 'nl'),
    ('march-2026-11', now() - interval '1 day', 'Mo March', 'mo.march@example.com', NULL, 'Leeds', NULL, false, NULL)
  RETURNING id, email
)
INSERT INTO form_entry_luma (entry_id, event_id, status)
SELECT id, 'evt-hfOj1RR5K1gBNEW', CASE WHEN email LIKE 'mo.%' THEN 'skipped' ELSE 'added' END FROM entries;

-- PauseAI's emails, as the Emails sync copies them (airtable-emails.json):
-- one of each mailing, personalised or not, the DeepMind letter's by its title, as it has no box.
CREATE TEMP TABLE seed_emails (airtable_id text, politician text, mailing text, personalised boolean, sent interval) ON COMMIT DROP;
INSERT INTO seed_emails VALUES
  ('recEmailCsrb', 'recDummy', 'CSRB Iqbal Amendment', false, '138 days'),
  ('recEmailEdinburghPolly', 'recPlaceholder', 'Edinburgh Conference Nov 26 Invitation', true, '25 days'),
  ('recEmailEdinburghMorag', 'recMorag', 'Edinburgh Conference Nov 26 Invitation', false, '25 days'),
  ('recEmailBenLake', 'recDummy', 'Ben Lake October 2026 Debate', false, '11 days'),
  ('recEmailDocumentary', 'recDummy', 'Documentary Invitation', false, '420 days'),
  ('recEmailWestminster', 'recPlaceholder', 'Westminster Hall Debate Invitation', true, '390 days'),
  ('recEmailDeepMind', 'recPlaceholder', 'DeepMind letter', true, '470 days');
CREATE TEMP TABLE seeded_emails ON COMMIT DROP AS
SELECT nextval(pg_get_serial_sequence('letters', 'id')) AS id, e.* FROM seed_emails e;
INSERT INTO letters (id, kind, notable_person_id, status, created_at, sent_at) OVERRIDING SYSTEM VALUE
SELECT e.id, 'pauseai', n.id, 'sent', now() - e.sent, now() - e.sent
FROM seeded_emails e JOIN notable_people n ON n.airtable_id = e.politician;
INSERT INTO letters_from_pauseai (id, mailing_id, airtable_id, personalised)
SELECT e.id, m.id, e.airtable_id, e.personalised FROM seeded_emails e
JOIN mailings m ON coalesce(m.airtable_field, m.title) = e.mailing;

-- Mailings written on the site: Jo's draft to the Commons, with a merge
-- field, a part only for those who signed the Frontier AI letter, and a
-- file; one scheduled for three days' time; one sent last week, one letter
-- of it bounced and one replied to.
CREATE TEMP TABLE seed_letter ON COMMIT DROP AS SELECT
  '{"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Dear "}, {"type": "field", "attrs": {"field": "salutation"}}, {"type": "text", "text": ","}]}, {"type": "onlyFor", "attrs": {"condition": "frontier-ai-letter:signed"}, "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Thank you for signing the letter."}]}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Will you come and meet us?"}]}]}'::jsonb AS body;
INSERT INTO mailings (title, subject, audience, channel, filter, body, created_by, sent_from, from_name, due_at, state, ask, created_at, opened_at)
SELECT m.title, m.title, 'politicians', 'email', m.filter::jsonb, b.body, 'jo@pauseai.uk', m.sent_from, m.from_name, now() + m.due, m.state,
  'edinburgh-conference-2026', now() + coalesce(m.due, interval '0') - interval '2 days', now() - interval '1 hour'
FROM seed_letter b, (VALUES
  ('Meet us in Westminster', '{"list": "politicians", "params": {"house": "commons"}}', NULL, NULL, NULL::interval, 'draft'),
  ('Edinburgh reminder', '{"list": "politicians", "params": {"nation": "scotland"}}', 'jo@pauseai.uk', 'Jo Seed', interval '3 days', 'scheduled'),
  ('Edinburgh follow-up', '{"list": "politicians", "params": {}}', 'jo@pauseai.uk', 'Jo Seed', interval '-7 days', 'sent')
) m (title, filter, sent_from, from_name, due, state);
INSERT INTO mailing_attachments (mailing_id, filename, content_type, content)
-- A one-page PDF, the smallest a reader draws: "Briefing" on an A4 page.
SELECT id, 'briefing.pdf', 'application/pdf', convert_to($pdf$%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources <</Font <</F1 5 0 R>>>>>> endobj
4 0 obj <</Length 39>> stream
BT /F1 48 Tf 72 720 Td (Briefing) Tj ET
endstream endobj
5 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj
trailer <</Root 1 0 R>>
%%EOF
$pdf$, 'UTF8') FROM mailings WHERE title = 'Meet us in Westminster';
CREATE TEMP TABLE seed_written ON COMMIT DROP AS
SELECT nextval(pg_get_serial_sequence('letters', 'id')) AS id, m.id AS mailing_id, m.state, m.due_at, n.id AS person,
  n.salutation, n.name, row_number() OVER (PARTITION BY m.id ORDER BY n.name) AS n
FROM mailings m JOIN notable_people n ON n.airtable_id IN ('recDummy', 'recPlaceholder', 'recMorag')
WHERE m.title IN ('Edinburgh reminder', 'Edinburgh follow-up');
INSERT INTO letters (id, kind, notable_person_id, status, created_at, sent_at, replied_at) OVERRIDING SYSTEM VALUE
SELECT w.id, 'pauseai', w.person,
  CASE WHEN w.state = 'scheduled' THEN 'scheduled' WHEN w.n = 1 THEN 'bounced' ELSE 'sent' END,
  w.due_at - interval '2 days', CASE WHEN w.state = 'sent' THEN w.due_at END,
  CASE WHEN w.state = 'sent' AND w.n = 2 THEN w.due_at + interval '1 day' END
FROM seed_written w;
INSERT INTO letters_from_pauseai (id, mailing_id, merge_values)
SELECT w.id, w.mailing_id, json_build_object('values', json_build_object('salutation', w.salutation, 'name', w.name), 'meets', '[]'::json)
FROM seed_written w;
-- The follow-up went from Jo's Gmail: each letter's send, with its
-- Message-ID and thread; the first bounced, as Jo's mailbox showed, and the
-- second was answered, the reply kept whole (tests/fixtures/letter-replies/).
INSERT INTO email_sends (at, purpose, letter_id, address, outcome, message_id, backend, sender, rfc_message_id, gmail_thread_id)
SELECT w.due_at, 'mailing', w.id, lower(n.email), 'sent', 'gmail-seed-' || w.n, 'gmail', 'jo@pauseai.uk',
  'fixture-letter-' || w.n || '@pauseai.uk', 'thread-seed-' || w.n
FROM seed_written w JOIN notable_people n ON n.id = w.person WHERE w.state = 'sent';
SELECT setval(pg_get_serial_sequence('email_problems', 'id'), (SELECT max(id) FROM email_problems));
INSERT INTO email_problems (at, address, message_id, kind, reason, can_reset, gmail_message_id)
SELECT w.due_at + interval '5 minutes', lower(n.email), 'gmail-seed-1', 'soft',
  '452 4.2.2 The recipient''s inbox is out of storage space.', true, 'gmail-seed-bounce'
FROM seed_written w JOIN notable_people n ON n.id = w.person WHERE w.state = 'sent' AND w.n = 1;
INSERT INTO letter_replies (letter_id, account, gmail_message_id, gmail_thread_id, rfc_message_id, from_address, from_name,
  subject, at, from_us, blob_key, size)
SELECT w.id, 'jo@pauseai.uk', 'gmail-seed-reply', 'thread-seed-2', 'fixture-polly-thanks@example.org', lower(n.email), n.name,
  'Re: Edinburgh follow-up', w.due_at + interval '1 day', false, 'fixture/polly-thanks.eml.gz', 512
FROM seed_written w JOIN notable_people n ON n.id = w.person WHERE w.state = 'sent' AND w.n = 2;
-- What happened to each, as sending and reading Jo's Gmail record it:
-- scheduled; then, in the mailing sent, sent, and the bounce and the reply.
INSERT INTO letter_events (letter_id, at, status, details)
SELECT id, due_at - interval '2 days', 'scheduled', '{}' FROM seed_written;
INSERT INTO letter_events (letter_id, at, status, details)
SELECT id, due_at, 'sent', jsonb_build_object('from', 'jo@pauseai.uk', 'messageId', 'fixture-letter-' || n || '@pauseai.uk',
  'threadId', 'thread-seed-' || n)
FROM seed_written WHERE state = 'sent';
INSERT INTO letter_events (letter_id, at, status, details)
SELECT w.id, w.due_at + interval '5 minutes', 'bounced', jsonb_build_object('status', '4.2.2', 'account', 'jo@pauseai.uk',
  'reason', '452 4.2.2 The recipient''s inbox is out of storage space.', 'email', lower(n.email))
FROM seed_written w JOIN notable_people n ON n.id = w.person WHERE w.state = 'sent' AND w.n = 1;
INSERT INTO letter_events (letter_id, at, status, details)
SELECT w.id, w.due_at + interval '1 day', 'replied', jsonb_build_object('from', lower(n.email), 'name', n.name,
  'gmailMessageId', 'gmail-seed-reply')
FROM seed_written w JOIN notable_people n ON n.id = w.person WHERE w.state = 'sent' AND w.n = 2;

-- A mailing to supporters, by email, to those following the calendar:
-- one delivered, one that failed, one skipped as they'd unsubscribed since.
INSERT INTO mailings (title, subject, audience, channel, topic, filter, body, created_by, sent_from, from_name, due_at, state)
SELECT 'Events this month', 'Events this month', 'supporters', 'email', 'luma-calendar',
  '{"list": "supporters", "params": {"contact": "email:luma-calendar:yes"}}', b.body, 'jo@pauseai.uk', 'jo@pauseai.uk',
  'PauseAI UK', now() - interval '4 days', 'sent'
FROM seed_letter b;

-- ---------------------------------------------------------- import log

-- Every job, in every state: Luma runs hourly, stopping short in each way;
-- syncs from when only MPs were read, applied by themselves, held then
-- discarded, held then applied; politician syncs unchanged, applied with
-- statuses, and one held now, changing more politicians than a sync may
-- unchecked and renaming one; Emails syncs, one holding back an email with
-- no mailing; checks with and without problems; ControlAI reads, one failed;
-- the signatory import, once; and each one-off import from Airtable.
INSERT INTO import_runs (at, job, started_by, status, error, result, decided_by) VALUES
  (now() - interval '3 days', 'import-luma', 'nightly', 'ok', NULL, '{"events": 12, "eventsSynced": 8, "eventsLeft": 4, "guestsChanged": 40, "people": 18, "contacts": 9, "supportersAdded": 15, "linked": 20, "requests": 150, "stoppedBy": "rate-limit"}', NULL),
  (now() - interval '2 days', 'import-luma', 'nightly', 'ok', NULL, '{"events": 0, "eventsSynced": 4, "eventsLeft": 0, "guestsChanged": 6, "people": 2, "contacts": 1, "supportersAdded": 2, "linked": 2, "requests": 60, "stoppedBy": "time"}', NULL),
  (now() - interval '2 days' + interval '1 minute', 'import-luma', 'jo@pauseai.uk', 'unchanged', NULL, '{"events": 0, "eventsSynced": 0, "eventsLeft": 0, "guestsChanged": 0, "people": 0, "contacts": 0, "supportersAdded": 0, "linked": 0, "requests": 0, "stoppedBy": "running"}', NULL),
  (now() - interval '1 day', 'import-luma', 'nightly', 'failed', 'Luma answered 500', '{}', NULL),
  (now() - interval '1 hour', 'import-luma', 'nightly', 'ok', NULL, '{"events": 1, "eventsSynced": 1, "eventsLeft": 0, "guestsChanged": 2, "people": 1, "contacts": 0, "supportersAdded": 1, "linked": 1, "requests": 5}', NULL),
  (now() - interval '20 days', 'sync-politicians', 'nightly', 'applied', NULL, '{"changes": {"added": [], "removed": [{"airtableId": "recGone", "name": "Gordon Gone", "salutation": "Mr Gone", "constituency": "Former Seat", "party": "Independent", "email": "gordon.gone.mp@parliament.uk"}], "changed": []}, "mps": []}', NULL),
  (now() - interval '19 days', 'sync-politicians', 'nightly', 'discarded', NULL, '{"changes": {"added": [], "removed": [{"airtableId": "recGone", "name": "Gordon Gone", "salutation": "Mr Gone", "constituency": "Former Seat", "party": "Independent", "email": "gordon.gone.mp@parliament.uk"}], "changed": []}}', 'jo@pauseai.uk'),
  (now() - interval '18 days', 'sync-politicians', 'jo@pauseai.uk', 'applied', NULL, '{"changes": {"added": [], "removed": [{"airtableId": "recGone", "name": "Gordon Gone", "salutation": "Mr Gone", "constituency": "Former Seat", "party": "Independent", "email": "gordon.gone.mp@parliament.uk"}], "changed": []}}', 'admin@pauseai.uk'),
  (now() - interval '1 day' + interval '1 hour', 'sync-politicians', 'nightly', 'unchanged', NULL, '{"changes": {"added": [], "removed": [], "changed": []}, "renamed": [], "statuses": {"added": 0, "changed": 0, "removed": 0}}', NULL),
  (now() - interval '6 days', 'sync-politicians', 'nightly', 'applied', NULL, '{"changes": {"added": [], "removed": [{"airtableId": "recRemoved", "name": "Rob Removed", "salutation": "Mr Removed", "email": "rob.removed.mp@parliament.uk", "status": "in_office", "house": "commons", "constituency": "Removed Seat", "party": "Example Party", "country": "england", "notes": "", "importantTarget": false, "personalConnection": false}], "changed": []}, "renamed": [], "statuses": {"added": 2, "changed": 1, "removed": 0}}', NULL),
  (now() - interval '1 day' + interval '1 hour' + interval '1 minute', 'sync-emails', 'nightly', 'ok', NULL, '{"read": 6, "added": 4, "waiting": 0, "noPolitician": 1, "unplaced": [{"airtableId": "recEmailNewBox", "mailings": []}]}', NULL),
  (now() - interval '2 days' + interval '1 hour' + interval '1 minute', 'sync-emails', 'nightly', 'unchanged', NULL, '{"read": 2, "added": 0, "waiting": 0, "noPolitician": 0, "unplaced": []}', NULL),
  (now() - interval '5 days', 'import-web-form-letters', 'admin@pauseai.uk', 'ok', NULL, '{"read": 8, "imported": 3, "skipped": 3, "alreadyHere": 1, "noPolitician": 1, "supportersAdded": 2, "linked": 3}', NULL),
  (now() - interval '5 days' + interval '2 minutes', 'import-go-to-parliament', 'admin@pauseai.uk', 'ok', NULL, '{"guests": 5, "mps": 4, "added": 3, "changed": 0, "notFound": 1}', NULL),
  (now() - interval '1 hour' + interval '5 minutes', 'sync-politicians', 'nightly', 'held', NULL, jsonb_set('{"renamed": [{"airtableId": "recPlaceholder", "from": "Polly Placeholder", "to": "Pauline Placeholder"}], "statuses": {"added": 0, "changed": 0, "removed": 0}, "records": [], "changes": {"added": [{"airtableId": "recNew", "name": "Nina New", "salutation": "Ms New", "constituency": "New Seat", "party": "Green", "email": "nina.new.mp@parliament.uk"}], "removed": [], "changed": [{"airtableId": "recPlaceholder", "name": "Polly Placeholder", "salutation": "Ms Placeholder", "constituency": "Cities of London and Westminster", "party": "Labour (Co-op)", "email": "polly.placeholder@parliament.uk"}]}}'::jsonb, '{changes,removed}', (SELECT jsonb_agg(jsonb_build_object('airtableId', 'recSeedGone' || n, 'name', 'Gone McSeed ' || n || ' MP', 'salutation', '', 'constituency', 'Seed Seat ' || n, 'party', '', 'email', NULL) ORDER BY n) FROM generate_series(1, 22) n)), NULL),
  (now() - interval '2 days' + interval '1 hour', 'check-mps', 'nightly', 'ok', NULL, '{"problems": []}', NULL),
  (now() - interval '1 day' + interval '1 hour', 'check-mps', 'nightly', 'ok', NULL, '{"problems": [{"kind": "email", "constituency": "Cities of London and Westminster", "name": "Polly Placeholder", "airtable": "polly.placeholder.mp@parliament.uk", "parliament": ["polly.placeholder@parliament.uk"]}, {"kind": "missing", "constituency": "New Seat", "parliament": "Nina New"}]}', NULL),
  (now() - interval '2 days' + interval '2 hours', 'import-controlai', 'nightly', 'ok', NULL, '{"pdfUrl": "https://images.controlai.com/letter.pdf", "signatories": 86, "matched": 74, "added": 1, "removed": 0, "problems": [{"name": "Baroness Nobody", "kind": "nobody", "candidates": []}]}', NULL),
  (now() - interval '1 day' + interval '2 hours', 'import-controlai', 'nightly', 'failed', 'No PDF linked from the letter page', '{}', NULL),
  (now() - interval '30 days', 'import-signatories', 'admin@pauseai.uk', 'ok', NULL, '{"matched": 2, "added": 1, "alreadySet": 0}', NULL),
  (now() - interval '1 day' + interval '47 minutes', 'import-members', 'nightly', 'failed', 'Airtable request failed with status 503: Service Unavailable', '{}', NULL),
  (now() - interval '3 days 2 hours 13 minutes', 'import-members', 'nightly', 'ok', NULL, '{"members": 7, "added": 1, "changed": 0, "removed": 0, "supportersAdded": 1, "linked": 1}', NULL),
  (now() - interval '1 hour' + interval '47 minutes', 'import-members', 'nightly', 'unchanged', NULL, '{"members": 8, "added": 0, "changed": 0, "removed": 0, "supportersAdded": 0, "linked": 0}', NULL);

-- The held sync keeps every record, as it read them: those here, with
-- Airtable's statuses, and Nina New, so applying it changes only what it
-- says.
UPDATE import_runs SET result = jsonb_set(result, '{records}', (
  SELECT jsonb_agg(r) FROM (
    SELECT jsonb_build_object(
      'politician', jsonb_build_object('airtableId', n.airtable_id, 'name', n.name, 'salutation', n.salutation, 'email', n.email, 'status', n.status, 'house', p.house,
        'constituency', p.constituency, 'party', p.party, 'country', p.country, 'notes', n.notes,
        'importantTarget', n.important_target, 'personalConnection', n.personal_connection),
      'statuses', coalesce((SELECT jsonb_object_agg(s.ask, s.status) FROM ask_statuses s
        WHERE s.notable_person_id = n.id AND s.updated_by = 'airtable' AND s.ask <> 'go-to-parliament-oct-2026'), '{}')) AS r
    FROM notable_people n JOIN politicians p USING (id) WHERE n.airtable_id IS NOT NULL AND n.airtable_removed_at IS NULL
    UNION ALL
    SELECT '{"politician": {"airtableId": "recNew", "name": "Nina New", "salutation": "Ms New", "email": "nina.new.mp@parliament.uk", "status": "in_office", "house": "commons", "constituency": "New Seat", "party": "Green", "country": "england", "notes": "", "importantTarget": false, "personalConnection": false}, "statuses": {}}'::jsonb
  ) records))
WHERE job = 'sync-politicians' AND status = 'held';

-- ------------------------------------------------------------ audit log

-- Who did what, as the staff pages and the jobs log it: every kind of entry.
INSERT INTO audit_log (at, actor, action, details) VALUES
  (now() - interval '60 days', 'sync', 'add politician', '{"id": 0, "airtableId": "recDummy", "house": "commons", "name": "Ms Dora Dummy", "salutation": "Ms Dummy", "constituency": "Hackney North and Stoke Newington", "party": "Labour", "email": "mp90001.office@parliament.uk"}'),
  (now() - interval '60 days', 'sync', 'add politician', '{"id": 0, "airtableId": "recPlaceholder", "house": "commons", "name": "Polly Placeholder", "salutation": "Ms Placeholder", "constituency": "Cities of London and Westminster", "party": "Labour (Co-op)", "email": "polly.placeholder.mp@parliament.uk"}'),
  (now() - interval '60 days', 'sync', 'add politician', '{"id": 0, "airtableId": "recGone", "house": "commons", "name": "Gordon Gone", "salutation": "Mr Gone", "constituency": "Former Seat", "party": "Independent", "email": "gordon.gone.mp@parliament.uk"}'),
  (now() - interval '60 days', 'sync', 'apply MP sync', '{"added": 3, "removed": 0, "changed": 0}'),
  (now() - interval '40 days', 'admin@pauseai.uk', 'add staff account', '{"email": "jo@pauseai.uk", "to": ["supporters"]}'),
  (now() - interval '40 days', 'admin@pauseai.uk', 'add staff account', '{"email": "gone@pauseai.uk", "to": []}'),
  (now() - interval '30 days', 'admin@pauseai.uk', 'add politician', '{"id": 0, "house": "lords", "name": "Lord Seedling of Example", "constituency": null, "party": "Crossbench", "email": null}'),
  (now() - interval '30 days', 'admin@pauseai.uk', 'import signatories from Airtable', '{"matched": 2, "added": 1, "alreadySet": 0}'),
  (now() - interval '25 days', 'admin@pauseai.uk', 'remove staff account', '{"email": "gone@pauseai.uk", "permissions": []}'),
  (now() - interval '20 days', 'sync', 'apply MP sync', '{"added": 0, "removed": 1, "changed": 0}'),
  (now() - interval '19 days', 'jo@pauseai.uk', 'discard held MP sync', '{"id": 6}'),
  (now() - interval '18 days', 'sync', 'remove politician', '{"id": 0, "name": "Gordon Gone"}'),
  (now() - interval '18 days', 'admin@pauseai.uk', 'apply held MP sync', '{"id": 8}'),
  (now() - interval '10 days', 'controlai', 'import ControlAI letter', '{"added": 1, "removed": 0, "problems": 1}'),
  (now() - interval '10 days', 'controlai', 'set status', '{"politicianId": 0, "ask": "controlai-letter", "status": "signed", "date": "2026-09-11", "note": ""}'),
  (now() - interval '9 days', 'sync', 'edit politician', '{"id": 0, "airtableId": "recPlaceholder", "house": "commons", "name": "Polly Placeholder", "salutation": "Ms Placeholder", "constituency": "Cities of London and Westminster", "party": "Labour (Co-op)", "email": "polly.placeholder.mp@parliament.uk"}'),
  (now() - interval '15 days', 'jo@pauseai.uk', 'erase supporter', '{"id": 99, "reference": "GDPR-2026-014", "letters": 1, "lumaUsers": 1, "members": 1}'),
  (now() - interval '12 days', 'samuel.whitlock@pauseai.uk', 'edit politician', '{"id": 0, "house": "lords", "name": "Lord Seedling of Example", "salutation": "Lord Seedling", "constituency": null, "party": "Crossbench", "email": null}'),
  (now() - interval '12 days' + interval '1 minute', 'postmark', 'block address', '{"address": "no-such-mailbox@pauseai.uk", "kind": "hard"}'),
  (now() - interval '9 days', 'postmark', 'block address', '{"address": "gordon.gone.mp@parliament.uk", "kind": "hard"}'),
  (now() - interval '6 days', 'admin@pauseai.uk', 'add staff account', '{"email": "samuel.whitlock@pauseai.uk", "to": []}'),
  (now() - interval '5 days' + interval '3 hours', 'postmark', 'block address', '{"address": "grumpy@example.com", "kind": "complaint"}'),
  (now() - interval '4 days', 'admin@pauseai.uk', 'set staff permissions', '{"email": "samuel.whitlock@pauseai.uk", "from": [], "to": []}'),
  (now() - interval '3 days', 'jo@pauseai.uk', 'view supporter', '{"id": 1}'),
  (now() - interval '3 days', 'jo@pauseai.uk', 'set status', '{"politicianId": 0, "ask": "controlai-letter", "status": "signed", "date": null, "note": ""}'),
  (now() - interval '2 days', 'samuel.whitlock@pauseai.uk', 'set status', '{"politicianId": 0, "ask": "frontier-ai-letter", "status": "signed", "date": null, "note": ""}'),
  (now() - interval '2 days' + interval '1 hour', 'jo@pauseai.uk', 'unblock address', '{"address": "polly.placeholder.mp@parliament.uk", "note": "Mailbox emptied, their office says"}'),
  (now() - interval '1 day', 'jo@pauseai.uk', 'set status', '{"politicianId": 0, "ask": "frontier-ai-letter", "status": "signed", "date": null, "note": "Confirmed by their office"}'),
  (now() - interval '1 day' + interval '2 hours', 'nightly', 'import ControlAI letter', '{"error": "No PDF linked from the letter page"}'),
  (now() - interval '2 hours', 'jo@pauseai.uk', 'view supporter', '{"id": 4}'),
  (now() - interval '6 days', 'sync', 'apply politician sync', '{"added": 0, "removed": 1, "changed": 0}'),
  (now() - interval '6 days', 'sync', 'remove politician', '{"id": 0, "name": "Rob Removed"}'),
  (now() - interval '1 hour' + interval '5 minutes', 'sync', 'hold politician sync', '{"added": 1, "removed": 22, "changed": 1}'),
  (now() - interval '20 days', 'airtable', 'set status', '{"politicianId": 0, "ask": "edinburgh-conference-2026", "status": "declined", "date": null, "note": ""}'),
  (now() - interval '20 days', 'airtable', 'set status', '{"politicianId": 0, "ask": "controlai-statement", "status": "signed", "date": "2025-02-06", "note": ""}'),
  (now() - interval '5 days', 'admin@pauseai.uk', 'import web form letters', '{"imported": 3, "skipped": 3, "alreadyHere": 1, "noPolitician": 1}'),
  (now() - interval '5 days' + interval '2 minutes', 'admin@pauseai.uk', 'import Go to Parliament', '{"added": 3, "changed": 0}'),
  (now() - interval '1 day' + interval '1 hour' + interval '1 minute', 'sync', 'copy PauseAI emails', '{"added": 4}');
-- The entries about a politician name their row.
UPDATE audit_log a SET details = jsonb_set(a.details, '{id}', to_jsonb(p.id)) FROM notable_people p
  WHERE a.action IN ('add politician', 'edit politician', 'remove politician') AND p.name = a.details->>'name';
UPDATE audit_log SET details = jsonb_set(details, '{politicianId}', to_jsonb((SELECT id FROM notable_people WHERE name = 'Lord Seedling of Example'))) WHERE action = 'set status' AND actor = 'controlai';
UPDATE audit_log SET details = jsonb_set(details, '{politicianId}', to_jsonb((SELECT id FROM politicians WHERE test_postcode = 'ZZ99ZZ'))) WHERE action = 'set status' AND details->>'ask' = 'controlai-letter' AND actor = 'jo@pauseai.uk';
UPDATE audit_log SET details = jsonb_set(details, '{politicianId}', to_jsonb((SELECT id FROM notable_people WHERE airtable_id = 'recDummy'))) WHERE action = 'set status' AND details->>'note' = '' AND actor = 'samuel.whitlock@pauseai.uk';
UPDATE audit_log SET details = jsonb_set(details, '{politicianId}', to_jsonb((SELECT id FROM politicians WHERE test_postcode = 'ZZ99ZH'))) WHERE action = 'set status' AND details->>'note' = 'Confirmed by their office';
UPDATE audit_log SET details = jsonb_set(details, '{politicianId}', to_jsonb((SELECT id FROM notable_people WHERE airtable_id = 'recPlaceholder'))) WHERE action = 'set status' AND actor = 'airtable';

-- ----------------------------------------------------------- supporters

-- One supporter per email, linked to everything with that email, as the
-- matcher makes them; created when their first record was. Fewer arrived
-- the week before last than in the last week.
WITH emails AS (
  SELECT email, coalesce(contact_since, (SELECT min(g.registered_at) FROM luma_guests g WHERE g.user_id = p.user_id)) AS first_seen FROM luma_people p
  UNION ALL
  SELECT lower(trim(email)), created_at FROM form_entries
  UNION ALL
  SELECT email, joined_at FROM members
), firsts AS (
  SELECT email, min(first_seen) AS first_seen FROM emails GROUP BY email
), made AS (
  INSERT INTO supporters (created_at) SELECT first_seen FROM firsts ORDER BY first_seen, email RETURNING id, created_at
), keyed AS (
  SELECT m.id, f.email FROM (SELECT id, created_at, row_number() OVER (ORDER BY created_at, id) AS n FROM made) m
  JOIN (SELECT email, first_seen, row_number() OVER (ORDER BY first_seen, email) AS n FROM firsts) f USING (n)
), luma_links AS (
  INSERT INTO supporter_links (supporter_id, luma_user_id, matched_by, matched_value, linked_at)
  SELECT k.id, p.user_id, 'email', k.email, now() - interval '1 hour' FROM keyed k JOIN luma_people p ON p.email = k.email
), member_links AS (
  INSERT INTO supporter_links (supporter_id, member_id, matched_by, matched_value, linked_at)
  SELECT k.id, m.id, 'email', k.email, m.first_seen_at FROM keyed k JOIN members m ON m.email = k.email
)
INSERT INTO supporter_links (supporter_id, form_entry_id, matched_by, matched_value, linked_at)
SELECT k.id, f.id, 'email', k.email, f.created_at FROM keyed k JOIN form_entries f ON lower(trim(f.email)) = k.email;

-- Then those who gave the same UK mobile number are one, as the matcher
-- merges them; and Jane Fixture was once two, the other's ID long gone.
SELECT count(*) FROM merge_supporters_by_phone();
INSERT INTO supporter_merges (from_id, into_id, merged_at)
SELECT (SELECT max(id) + 1000 FROM supporters), k.supporter_id, now() - interval '20 days'
FROM supporter_links k WHERE k.luma_user_id = 'usr-fixture-1';

-- Each supporter's first seen, as refreshSupporterFacts() (lib/server/supporter-facts.ts) sets it after linking.
UPDATE supporters s SET first_seen_at = f.first_seen_at FROM supporter_first_seen f WHERE f.supporter_id = s.id;

-- The supporters mailing's messages, now there are supporters to send them to.
WITH m AS (SELECT id, due_at FROM mailings WHERE title = 'Events this month'),
  three AS (SELECT s.id, row_number() OVER (ORDER BY s.id) AS n FROM supporters s ORDER BY s.id LIMIT 3),
  messages AS (
    INSERT INTO messages_to_supporters (mailing_id, supporter_id, address, status, provider_message_id, merge_values, skip_reason, sent_at)
    SELECT m.id, t.id, 'supporter' || t.n || '@example.com',
      (ARRAY['delivered', 'failed', 'skipped'])[t.n], CASE WHEN t.n < 3 THEN 'seed-message-' || t.n END, '{}',
      CASE WHEN t.n = 3 THEN 'unsubscribed' END, CASE WHEN t.n < 3 THEN m.due_at END
    FROM m, three t
    RETURNING id, status, sent_at
  )
INSERT INTO message_events (message_id, at, kind)
SELECT id, sent_at, 'sent' FROM messages WHERE status <> 'skipped'
UNION ALL
SELECT id, sent_at + interval '1 minute', CASE status WHEN 'delivered' THEN 'delivered' ELSE 'failed' END FROM messages WHERE status <> 'skipped';
