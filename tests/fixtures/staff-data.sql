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
-- the matcher (lib/server/supporters.ts) would make them: one per email.

-- ---------------------------------------------------------------- staff

-- The migration's admin; someone who may see supporters, with a kept
-- session; someone with an account alone; and someone removed last month.
INSERT INTO staff_accounts (email, permissions, added_by, added_at) VALUES
  ('jo@pauseai.uk', '{supporters}', 'admin@pauseai.uk', now() - interval '40 days'),
  ('sam@pauseai.uk', '{}', 'admin@pauseai.uk', now() - interval '6 days');
INSERT INTO staff_sessions (token_hash, email, created_at, expires_at, remember) VALUES
  ('seed-session-jo-kept', 'jo@pauseai.uk', now() - interval '3 days', now() + interval '27 days', true),
  ('seed-session-jo-old', 'jo@pauseai.uk', now() - interval '20 days', now() - interval '19 days', false);
INSERT INTO staff_login_links (token_hash, email, browser_hash, created_at, expires_at, used_at, remember) VALUES
  ('seed-link-used', 'jo@pauseai.uk', 'seed-browser', now() - interval '3 days', now() - interval '3 days' + interval '15 minutes', now() - interval '3 days' + interval '2 minutes', true),
  ('seed-link-expired', 'sam@pauseai.uk', 'seed-browser', now() - interval '1 day', now() - interval '1 day' + interval '15 minutes', NULL, false);

-- ---------------------------------------------------------- politicians

-- Airtable's two MPs, as the sync copies them; a peer the signatory import
-- added, whom staff may edit; and an MP who has left, kept for their letters.
INSERT INTO politicians (airtable_id, house, name, salutation, constituency, party, email, sitting, created_at, updated_at) VALUES
  ('recDummy', 'commons', 'Ms Dora Dummy', 'Ms Dummy', 'Hackney North and Stoke Newington', 'Labour', 'mp90001.office@parliament.uk', true, now() - interval '60 days', now() - interval '60 days'),
  ('recPlaceholder', 'commons', 'Polly Placeholder', 'Ms Placeholder', 'Cities of London and Westminster', 'Labour (Co-op)', 'polly.placeholder.mp@parliament.uk', true, now() - interval '60 days', now() - interval '9 days'),
  (NULL, 'lords', 'Lord Seedling of Example', 'Lord Seedling', NULL, 'Crossbench', NULL, true, now() - interval '30 days', now() - interval '12 days'),
  ('recGone', 'commons', 'Gordon Gone', 'Mr Gone', 'Former Seat', 'Independent', 'gordon.gone.mp@parliament.uk', false, now() - interval '60 days', now() - interval '20 days');

-- Statuses: Polly signed the letter to the PM last month; Dora this week;
-- the peer backs the bill, from ControlAI's letter, the week before; Backy
-- McTestface MP's bill status (lib/test-mps.json) was already there.
INSERT INTO campaign_statuses (politician_id, campaign, status, status_date, note, updated_by, updated_at)
SELECT id, 'regulate-letter-pm', 'signed', (now() - interval '35 days')::date, 'Told us at the march', 'jo@pauseai.uk', now() - interval '34 days' FROM politicians WHERE airtable_id = 'recPlaceholder';
INSERT INTO campaign_statuses (politician_id, campaign, status, status_date, note, updated_by, updated_at)
SELECT id, 'regulate-letter-pm', 'signed', (now() - interval '2 days')::date, '', 'sam@pauseai.uk', now() - interval '2 days' FROM politicians WHERE airtable_id = 'recDummy';
INSERT INTO campaign_statuses (politician_id, campaign, status, status_date, note, updated_by, updated_at)
SELECT id, 'support-sobel-bill', 'signed', NULL, 'From ControlAI''s letter', 'import', now() - interval '10 days' FROM politicians WHERE name = 'Lord Seedling of Example';
INSERT INTO campaign_statuses (politician_id, campaign, status, status_date, note, updated_by, updated_at)
SELECT id, 'support-sobel-bill', 'signed', (now() - interval '3 days')::date, '', 'jo@pauseai.uk', now() - interval '3 days' FROM politicians WHERE test_postcode = 'ZZ99ZZ';
INSERT INTO campaign_statuses (politician_id, campaign, status, status_date, note, updated_by, updated_at)
SELECT id, 'regulate-letter-pm', 'signed', (now() - interval '1 day')::date, 'Confirmed by their office', 'jo@pauseai.uk', now() - interval '1 day' FROM politicians WHERE test_postcode = 'ZZ99ZH';

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
  ('usr-seed-20', 'erased.seed@example.com', 'Erin Erased', now() - interval '70 days', now() - interval '1 day');
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
  ('sam.fixture@example.com', 'luma-calendar', 'luma-webhook', 'seed-unsubscribe-sam', now() - interval '20 days', now() - interval '17 days');

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
INSERT INTO opt_outs (address, list, source, source_ref, unsubscribed_at, resubscribed_at) VALUES
  ('owen.member@example.com', 'pauseai-updates', 'airtable-import', 'recMemberOwen', now() - interval '9 days 22 hours', NULL),
  ('rhea.member@example.com', 'pauseai-updates', 'airtable-import', 'recMemberRheaOld', '2026-07-10T00:00:00Z', now() - interval '5 days 4 hours');

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
INSERT INTO letters (campaign, politician_id, sender_name, sender_email, sender_address, sender_postcode, contact_consent, subject, reply_hash, status, created_at, sent_at, replied_at)
SELECT s.campaign, p.id, s.sender, s.email, s.address, s.sender_postcode, s.consent, s.subject, 'seed-' || s.hash, s.status,
       now() - s.created, now() - s.sent + interval '4 seconds', now() - s.replied
FROM seed_letters s JOIN politicians p ON p.test_postcode = s.postcode;
-- Most of the recent letters went to Airtable's two MPs, so the dashboard,
-- which leaves the test MPs out, counts them; the bounces stay on Bouncy's.
UPDATE letters SET politician_id = (SELECT id FROM politicians WHERE airtable_id = 'recDummy')
WHERE reply_hash IN ('seed-prev-lee', 'seed-prev-li', 'seed-week-ben', 'seed-week-kwame', 'seed-week-noah');
UPDATE letters SET politician_id = (SELECT id FROM politicians WHERE airtable_id = 'recPlaceholder')
WHERE reply_hash IN ('seed-prev-omar', 'seed-week-sam', 'seed-week-grace', 'seed-week-mia');

-- Their history: sending, then sent, then what followed.
INSERT INTO letter_events (letter_id, at, status, details) SELECT id, created_at, 'sending', '{}' FROM letters WHERE reply_hash LIKE 'seed-%';
INSERT INTO letter_events (letter_id, at, status, details) SELECT id, sent_at, 'sent', jsonb_build_object('messageId', 'seed-message-' || id) FROM letters WHERE reply_hash LIKE 'seed-%' AND sent_at IS NOT NULL;
INSERT INTO letter_events (letter_id, at, status, details) SELECT id, created_at + interval '1 second', 'not_sent', '{"reason": "The MP has no email address"}' FROM letters WHERE status = 'not_sent' AND reply_hash LIKE 'seed-%';
INSERT INTO letter_events (letter_id, at, status, details) SELECT id, replied_at, 'replied', jsonb_build_object('from', 'The office of ' || (SELECT name FROM politicians WHERE id = politician_id)) FROM letters WHERE replied_at IS NOT NULL AND reply_hash LIKE 'seed-%';
INSERT INTO letter_events (letter_id, at, status, details) SELECT id, sent_at + interval '2 minutes', 'auto_reply', '{"from": "Backy McTestface MP", "subject": "Out of office"}' FROM letters WHERE reply_hash IN ('seed-prev-ahmed', 'seed-week-mia');
INSERT INTO letter_events (letter_id, at, status, details) SELECT id, sent_at + interval '1 minute', 'bounced', '{"type": "HardBounce", "description": "The address does not exist"}' FROM letters WHERE status = 'bounced' AND reply_hash LIKE 'seed-%';
INSERT INTO letter_events (letter_id, at, status, details) SELECT id, sent_at + interval '3 hours', 'spam_complaint', '{"type": "SpamComplaint"}' FROM letters WHERE status = 'spam_complaint' AND reply_hash LIKE 'seed-%';

-- Every email that went out, or didn't: the letters, two forwarded replies,
-- staff login links, a bounce alert; one refused by a block, one that failed.
INSERT INTO email_sends (at, purpose, letter_id, address, outcome, message_id)
SELECT sent_at, 'letter', id, (SELECT coalesce(email, '') FROM politicians WHERE id = politician_id), 'sent', 'seed-message-' || id FROM letters WHERE sent_at IS NOT NULL AND reply_hash LIKE 'seed-%';
INSERT INTO email_sends (at, purpose, letter_id, address, outcome, message_id)
SELECT replied_at + interval '1 minute', 'forwarded-reply', id, 'replies@pauseai.uk', 'sent', 'seed-forward-' || id FROM letters WHERE replied_at IS NOT NULL AND reply_hash IN ('seed-week-sam', 'seed-week-grace');
INSERT INTO email_sends (at, purpose, letter_id, address, outcome, message_id) VALUES
  (now() - interval '3 days', 'staff-login', NULL, 'jo@pauseai.uk', 'sent', 'seed-login-jo'),
  (now() - interval '1 day', 'staff-login', NULL, 'sam@pauseai.uk', 'sent', 'seed-login-sam'),
  (now() - interval '3 days' + interval '5 minutes', 'staff-alert', NULL, 'admin@pauseai.uk', 'sent', 'seed-alert-bounce'),
  (now() - interval '1 day', 'letter', NULL, 'no-such-mailbox@pauseai.uk', 'refused', NULL),
  (now() - interval '8 days', 'letter', NULL, 'polly.placeholder.mp@parliament.uk', 'failed', NULL);

-- Delivery problems: the bounces that blocked Bouncy's address, a soft
-- bounce that blocked nothing, a complaint that blocked the sender, and a
-- block from the week before last on an MP's old address.
INSERT INTO email_problems (id, at, address, message_id, kind, reason, can_reset, details) OVERRIDING SYSTEM VALUE VALUES
  (1, now() - interval '12 days' + interval '1 minute', 'no-such-mailbox@pauseai.uk', NULL, 'hard', 'The address does not exist', true, '{"type": "HardBounce"}'),
  (2, now() - interval '10 days' + interval '1 minute', 'no-such-mailbox@pauseai.uk', NULL, 'hard', 'The address does not exist', true, '{"type": "HardBounce"}'),
  (3, now() - interval '9 days', 'gordon.gone.mp@parliament.uk', NULL, 'hard', 'Mailbox closed', true, '{"type": "HardBounce"}'),
  (4, now() - interval '5 days' + interval '3 hours', 'grumpy@example.com', NULL, 'complaint', 'Marked as spam', false, '{"type": "SpamComplaint"}'),
  (5, now() - interval '4 days', 'polly.placeholder.mp@parliament.uk', NULL, 'soft', 'Mailbox full', true, '{"type": "SoftBounce"}'),
  (6, now() - interval '3 days' + interval '1 minute', 'no-such-mailbox@pauseai.uk', NULL, 'hard', 'The address does not exist', true, '{"type": "HardBounce"}');
UPDATE email_problems p SET message_id = 'seed-message-' || l.id FROM letters l WHERE l.reply_hash = 'seed-prev-bounce-1' AND p.id = 1;
UPDATE email_problems p SET message_id = 'seed-message-' || l.id FROM letters l WHERE l.reply_hash = 'seed-prev-bounce-2' AND p.id = 2;
UPDATE email_problems p SET message_id = 'seed-message-' || l.id FROM letters l WHERE l.reply_hash = 'seed-week-spam' AND p.id = 4;
UPDATE email_problems p SET message_id = 'seed-message-' || l.id FROM letters l WHERE l.reply_hash = 'seed-week-bounce' AND p.id = 6;
-- Blocked: Bouncy's address by the first bounce, Gordon's by his, Gus by his
-- complaint. Polly's soft bounce blocked nothing.
INSERT INTO email_blocks (address, problem_id) VALUES
  ('no-such-mailbox@pauseai.uk', 1),
  ('gordon.gone.mp@parliament.uk', 3),
  ('grumpy@example.com', 4);

-- ---------------------------------------------------------- import log

-- Every job, in every state: Luma runs hourly, stopping short in each way;
-- MP syncs applied by themselves, unchanged, held then discarded, held then
-- applied, and one held now, changing more MPs than a sync may unchecked; checks with and without problems; ControlAI reads, one failed; the
-- signatory import, once.
INSERT INTO import_runs (at, job, started_by, status, error, result, decided_by) VALUES
  (now() - interval '3 days', 'import-luma', 'nightly', 'ok', NULL, '{"events": 12, "eventsSynced": 8, "eventsLeft": 4, "guestsChanged": 40, "people": 18, "contacts": 9, "supportersAdded": 15, "linked": 20, "requests": 150, "stoppedBy": "rate-limit"}', NULL),
  (now() - interval '2 days', 'import-luma', 'nightly', 'ok', NULL, '{"events": 0, "eventsSynced": 4, "eventsLeft": 0, "guestsChanged": 6, "people": 2, "contacts": 1, "supportersAdded": 2, "linked": 2, "requests": 60, "stoppedBy": "time"}', NULL),
  (now() - interval '2 days' + interval '1 minute', 'import-luma', 'jo@pauseai.uk', 'unchanged', NULL, '{"events": 0, "eventsSynced": 0, "eventsLeft": 0, "guestsChanged": 0, "people": 0, "contacts": 0, "supportersAdded": 0, "linked": 0, "requests": 0, "stoppedBy": "running"}', NULL),
  (now() - interval '1 day', 'import-luma', 'nightly', 'failed', 'Luma answered 500', '{}', NULL),
  (now() - interval '1 hour', 'import-luma', 'nightly', 'ok', NULL, '{"events": 1, "eventsSynced": 1, "eventsLeft": 0, "guestsChanged": 2, "people": 1, "contacts": 0, "supportersAdded": 1, "linked": 1, "requests": 5}', NULL),
  (now() - interval '20 days', 'sync-mps', 'nightly', 'applied', NULL, '{"changes": {"added": [], "removed": [{"airtableId": "recGone", "name": "Gordon Gone", "salutation": "Mr Gone", "constituency": "Former Seat", "party": "Independent", "email": "gordon.gone.mp@parliament.uk"}], "changed": []}, "mps": []}', NULL),
  (now() - interval '19 days', 'sync-mps', 'nightly', 'discarded', NULL, '{"changes": {"added": [], "removed": [{"airtableId": "recGone", "name": "Gordon Gone", "salutation": "Mr Gone", "constituency": "Former Seat", "party": "Independent", "email": "gordon.gone.mp@parliament.uk"}], "changed": []}}', 'jo@pauseai.uk'),
  (now() - interval '18 days', 'sync-mps', 'jo@pauseai.uk', 'applied', NULL, '{"changes": {"added": [], "removed": [{"airtableId": "recGone", "name": "Gordon Gone", "salutation": "Mr Gone", "constituency": "Former Seat", "party": "Independent", "email": "gordon.gone.mp@parliament.uk"}], "changed": []}}', 'admin@pauseai.uk'),
  (now() - interval '1 day' + interval '1 hour', 'sync-mps', 'nightly', 'unchanged', NULL, '{"changes": {"added": [], "removed": [], "changed": []}}', NULL),
  (now() - interval '1 hour' + interval '5 minutes', 'sync-mps', 'nightly', 'held', NULL, jsonb_set('{"changes": {"added": [{"airtableId": "recNew", "name": "Nina New", "salutation": "Ms New", "constituency": "New Seat", "party": "Green", "email": "nina.new.mp@parliament.uk"}], "removed": [], "changed": [{"airtableId": "recPlaceholder", "name": "Polly Placeholder", "salutation": "Ms Placeholder", "constituency": "Cities of London and Westminster", "party": "Labour (Co-op)", "email": "polly.placeholder@parliament.uk"}]}, "mps": [{"airtableId": "recNew", "name": "Nina New", "salutation": "Ms New", "constituency": "New Seat", "party": "Green", "email": "nina.new.mp@parliament.uk"}]}'::jsonb, '{changes,removed}', (SELECT jsonb_agg(jsonb_build_object('airtableId', 'recSeedGone' || n, 'name', 'Gone McSeed ' || n || ' MP', 'salutation', '', 'constituency', 'Seed Seat ' || n, 'party', '', 'email', NULL) ORDER BY n) FROM generate_series(1, 22) n)), NULL),
  (now() - interval '2 days' + interval '1 hour', 'check-mps', 'nightly', 'ok', NULL, '{"problems": []}', NULL),
  (now() - interval '1 day' + interval '1 hour', 'check-mps', 'nightly', 'ok', NULL, '{"problems": [{"kind": "email", "constituency": "Cities of London and Westminster", "name": "Polly Placeholder", "airtable": "polly.placeholder.mp@parliament.uk", "parliament": ["polly.placeholder@parliament.uk"]}, {"kind": "missing", "constituency": "New Seat", "parliament": "Nina New"}]}', NULL),
  (now() - interval '2 days' + interval '2 hours', 'import-controlai', 'nightly', 'ok', NULL, '{"pdfUrl": "https://images.controlai.com/letter.pdf", "signatories": 86, "matched": 74, "added": 1, "removed": 0, "problems": [{"name": "Baroness Nobody", "kind": "nobody", "candidates": []}]}', NULL),
  (now() - interval '1 day' + interval '2 hours', 'import-controlai', 'nightly', 'failed', 'No PDF linked from the letter page', '{}', NULL),
  (now() - interval '30 days', 'import-signatories', 'admin@pauseai.uk', 'ok', NULL, '{"matched": 2, "added": 1, "alreadySet": 0}', NULL),
  (now() - interval '1 day' + interval '47 minutes', 'import-members', 'nightly', 'failed', 'Airtable request failed with status 503: Service Unavailable', '{}', NULL),
  (now() - interval '3 days 2 hours 13 minutes', 'import-members', 'nightly', 'ok', NULL, '{"members": 7, "added": 1, "changed": 0, "removed": 0, "optedOut": 0, "resubscribed": 0, "supportersAdded": 1, "linked": 1}', NULL),
  (now() - interval '1 hour' + interval '47 minutes', 'import-members', 'nightly', 'unchanged', NULL, '{"members": 8, "added": 0, "changed": 0, "removed": 0, "optedOut": 0, "resubscribed": 0, "supportersAdded": 0, "linked": 0}', NULL);

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
  (now() - interval '10 days', 'controlai', 'set status', '{"politicianId": 0, "campaign": "support-sobel-bill", "status": "signed", "date": null, "note": ""}'),
  (now() - interval '9 days', 'sync', 'edit politician', '{"id": 0, "airtableId": "recPlaceholder", "house": "commons", "name": "Polly Placeholder", "salutation": "Ms Placeholder", "constituency": "Cities of London and Westminster", "party": "Labour (Co-op)", "email": "polly.placeholder.mp@parliament.uk"}'),
  (now() - interval '15 days', 'jo@pauseai.uk', 'erase supporter', '{"id": 99, "reference": "GDPR-2026-014", "letters": 1, "lumaUsers": 1, "members": 1}'),
  (now() - interval '12 days', 'sam@pauseai.uk', 'edit politician', '{"id": 0, "house": "lords", "name": "Lord Seedling of Example", "salutation": "Lord Seedling", "constituency": null, "party": "Crossbench", "email": null}'),
  (now() - interval '12 days' + interval '1 minute', 'postmark', 'block address', '{"address": "no-such-mailbox@pauseai.uk", "kind": "hard"}'),
  (now() - interval '9 days', 'postmark', 'block address', '{"address": "gordon.gone.mp@parliament.uk", "kind": "hard"}'),
  (now() - interval '6 days', 'admin@pauseai.uk', 'add staff account', '{"email": "sam@pauseai.uk", "to": []}'),
  (now() - interval '5 days' + interval '3 hours', 'postmark', 'block address', '{"address": "grumpy@example.com", "kind": "complaint"}'),
  (now() - interval '4 days', 'admin@pauseai.uk', 'set staff permissions', '{"email": "sam@pauseai.uk", "from": [], "to": []}'),
  (now() - interval '3 days', 'jo@pauseai.uk', 'view supporter', '{"id": 1}'),
  (now() - interval '3 days', 'jo@pauseai.uk', 'set status', '{"politicianId": 0, "campaign": "support-sobel-bill", "status": "signed", "date": null, "note": ""}'),
  (now() - interval '2 days', 'sam@pauseai.uk', 'set status', '{"politicianId": 0, "campaign": "regulate-letter-pm", "status": "signed", "date": null, "note": ""}'),
  (now() - interval '2 days' + interval '1 hour', 'jo@pauseai.uk', 'unblock address', '{"address": "polly.placeholder.mp@parliament.uk", "note": "Mailbox emptied, their office says"}'),
  (now() - interval '1 day', 'jo@pauseai.uk', 'set status', '{"politicianId": 0, "campaign": "regulate-letter-pm", "status": "signed", "date": null, "note": "Confirmed by their office"}'),
  (now() - interval '1 day' + interval '2 hours', 'nightly', 'import ControlAI letter', '{"error": "No PDF linked from the letter page"}'),
  (now() - interval '2 hours', 'jo@pauseai.uk', 'view supporter', '{"id": 4}');
-- The entries about a politician name their row.
UPDATE audit_log a SET details = jsonb_set(a.details, '{id}', to_jsonb(p.id)) FROM politicians p
  WHERE a.action IN ('add politician', 'edit politician', 'remove politician') AND p.name = a.details->>'name';
UPDATE audit_log SET details = jsonb_set(details, '{politicianId}', to_jsonb((SELECT id FROM politicians WHERE name = 'Lord Seedling of Example'))) WHERE action = 'set status' AND actor = 'controlai';
UPDATE audit_log SET details = jsonb_set(details, '{politicianId}', to_jsonb((SELECT id FROM politicians WHERE test_postcode = 'ZZ99ZZ'))) WHERE action = 'set status' AND details->>'campaign' = 'support-sobel-bill';
UPDATE audit_log SET details = jsonb_set(details, '{politicianId}', to_jsonb((SELECT id FROM politicians WHERE airtable_id = 'recDummy'))) WHERE action = 'set status' AND details->>'note' = '';
UPDATE audit_log SET details = jsonb_set(details, '{politicianId}', to_jsonb((SELECT id FROM politicians WHERE test_postcode = 'ZZ99ZH'))) WHERE action = 'set status' AND details->>'note' = 'Confirmed by their office';

-- ----------------------------------------------------------- supporters

-- One supporter per email, linked to everything with that email, as the
-- matcher makes them; created when their first record was. Fewer arrived
-- the week before last than in the last week.
WITH emails AS (
  SELECT email, coalesce(contact_since, (SELECT min(g.registered_at) FROM luma_guests g WHERE g.user_id = p.user_id)) AS first_seen FROM luma_people p
  UNION ALL
  SELECT lower(trim(sender_email)), created_at FROM letters WHERE reply_hash LIKE 'seed-%'
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
INSERT INTO supporter_links (supporter_id, letter_id, matched_by, matched_value, linked_at)
SELECT k.id, l.id, 'email', k.email, l.created_at FROM keyed k JOIN letters l ON lower(trim(l.sender_email)) = k.email;
