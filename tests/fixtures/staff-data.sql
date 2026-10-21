-- Fake supporters for a development database, so /staff/supporters has
-- people on it without importing anything: scripts/db-reset.mjs loads this
-- with DATA_FIXTURES=1 (addFixtureData in scripts/fresh-database.mjs).
-- The people, events and guests are the Luma fixtures' (luma-*.json), by the
-- same IDs, so Import Luma writes the same rows again rather than doubling
-- them. The letters go to the test MPs (lib/test-mps.json), which must be in
-- the database already. Supporters and their links are written as the
-- matcher (lib/server/supporters.ts) would make them: one per email.

INSERT INTO luma_events (id, name, url, start_at, access, city, latitude, longitude, guests_synced_at) VALUES
  ('evt-fixture-past-glasgow-stall', 'Glasgow street stall', 'https://luma.com/fixture-past-glasgow-stall', '2026-01-24T11:00:00Z', 'manage', 'Glasgow', 55.8617, -4.2583, '2026-10-20T12:00:00Z'),
  ('evt-fixture-past-london-march', 'PauseAI London March', 'https://luma.com/fixture-past-london-march', '2026-02-14T12:00:00Z', 'manage', 'London', 51.5045, -0.1262, '2026-10-20T12:00:00Z'),
  ('evt-fixture-london-protest', 'PauseAI London: Protest at Parliament', 'https://luma.com/fixture-london-protest', '2030-03-02T13:00:00Z', 'manage', 'London', 51.5007, -0.1268, '2026-10-20T12:00:00Z'),
  ('evt-fixture-online-intro', 'Introduction to PauseAI UK (online)', 'https://luma.com/fixture-online-intro', '2030-03-04T19:00:00Z', 'manage', NULL, NULL, NULL, '2026-10-20T12:00:00Z');

-- Jane and Alex follow the calendar and have been to events; Fay only follows it.
INSERT INTO luma_people (user_id, email, name, contact_since) VALUES
  ('usr-fixture-1', 'jane.fixture@example.com', 'Jane Fixture', '2026-09-20T09:00:00Z'),
  ('usr-fixture-2', 'sam.fixture@example.com', 'Sam Fixture', NULL),
  ('usr-fixture-3', 'alex.fixture@example.com', 'Alex Fixture', '2026-10-01T09:00:00Z'),
  ('usr-fixture-4', 'declined.fixture@example.com', 'Dee Clined', NULL),
  ('usr-fixture-5', 'pat.fixture@example.com', 'Pat Fixture', NULL),
  ('usr-fixture-6', 'follower.fixture@example.com', 'Fay Follower', '2026-08-01T09:00:00Z');

INSERT INTO luma_guests (id, event_id, user_id, approval_status, registered_at, phone, postcode, utm_source) VALUES
  ('gst-1', 'evt-fixture-past-london-march', 'usr-fixture-1', 'approved', '2026-01-26T12:00:00Z', '+447700900001', 'M1 1AE', 'brixton'),
  ('gst-fixture-1-protest', 'evt-fixture-london-protest', 'usr-fixture-1', 'approved', '2026-09-26T12:00:00Z', '+447700900001', 'M1 1AE', 'brixton'),
  ('gst-2', 'evt-fixture-past-london-march', 'usr-fixture-2', 'approved', '2026-02-01T12:30:00Z', NULL, NULL, 'stratford'),
  ('gst-fixture-2-intro', 'evt-fixture-online-intro', 'usr-fixture-2', 'waitlist', '2026-10-15T20:00:00Z', NULL, NULL, NULL),
  ('gst-3', 'evt-fixture-past-glasgow-stall', 'usr-fixture-3', 'approved', '2026-01-10T12:00:00Z', NULL, 'G1 1AA', 'brixton'),
  ('gst-4', 'evt-fixture-london-protest', 'usr-fixture-4', 'declined', '2026-10-10T12:30:00Z', NULL, NULL, 'brixton'),
  ('gst-5', 'evt-fixture-london-protest', 'usr-fixture-5', 'approved', '2026-10-10T13:00:00Z', '+447700900005', NULL, NULL);

-- Letters to the test MPs: one from Jane, who is also on Luma, answered by the MP; one from Lee, who is nowhere else.
INSERT INTO letters (campaign, politician_id, sender_name, sender_email, sender_address, sender_postcode, contact_consent, subject, reply_hash, status, created_at, sent_at, replied_at)
SELECT 'regulate-letter-pm', id, 'Jane Fixture', 'Jane.Fixture@example.com', '1 Fixture Street, Manchester', 'M1 1AE', true, 'Please back a pause on frontier AI', 'fixture-letter-jane', 'sent', '2026-10-02T10:00:00Z', '2026-10-02T10:00:05Z', '2026-10-09T15:30:00Z'
FROM politicians WHERE test_postcode = 'ZZ99ZZ';
INSERT INTO letters (campaign, politician_id, sender_name, sender_email, sender_address, sender_postcode, contact_consent, subject, reply_hash, status, created_at, sent_at)
SELECT 'regulate-letter-pm', id, 'Lee Letter', 'lee.letter@example.com', '2 Fixture Road, Bristol', 'BS1 1AA', false, 'AI safety matters to your constituents', 'fixture-letter-lee', 'sent', '2026-10-18T09:00:00Z', '2026-10-18T09:00:04Z'
FROM politicians WHERE test_postcode = 'ZZ99ZS';
INSERT INTO letter_events (letter_id, at, status) SELECT id, created_at, 'sending' FROM letters WHERE reply_hash LIKE 'fixture-letter-%';
INSERT INTO letter_events (letter_id, at, status) SELECT id, sent_at, 'sent' FROM letters WHERE reply_hash LIKE 'fixture-letter-%';
INSERT INTO letter_events (letter_id, at, status, details) SELECT id, replied_at, 'replied', '{"from": "Testy McTestface MP"}' FROM letters WHERE reply_hash = 'fixture-letter-jane';

-- Pat unsubscribed from the calendar's emails.
INSERT INTO opt_outs (address, list, source, source_ref, unsubscribed_at) VALUES
  ('pat.fixture@example.com', 'luma-calendar', 'luma-webhook', 'fixture-unsubscribe-pat', '2026-10-12T08:00:00Z');

-- One supporter per email, linked to everything with that email.
WITH emails AS (
  SELECT email FROM luma_people
  UNION
  SELECT lower(trim(sender_email)) FROM letters WHERE reply_hash LIKE 'fixture-letter-%'
), made AS (
  INSERT INTO supporters (created_at) SELECT '2026-10-20T12:00:00Z' FROM emails RETURNING id
), numbered AS (
  SELECT id, row_number() OVER (ORDER BY id) AS n FROM made
), keyed AS (
  SELECT n.id, e.email FROM numbered n JOIN (SELECT email, row_number() OVER (ORDER BY email) AS n FROM emails) e USING (n)
), luma_links AS (
  INSERT INTO supporter_links (supporter_id, luma_user_id, matched_by, matched_value)
  SELECT k.id, p.user_id, 'email', k.email FROM keyed k JOIN luma_people p ON p.email = k.email
)
INSERT INTO supporter_links (supporter_id, letter_id, matched_by, matched_value)
SELECT k.id, l.id, 'email', k.email FROM keyed k JOIN letters l ON lower(trim(l.sender_email)) = k.email;
