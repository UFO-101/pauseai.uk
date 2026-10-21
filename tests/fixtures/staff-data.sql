-- Fake data for a development database, so every staff page has something
-- on it without importing anything: scripts/db-reset.mjs loads this with
-- DATA_FIXTURES=1 (addFixtureData in scripts/fresh-database.mjs). The
-- people, events and guests are the Luma fixtures' (luma-*.json) and the
-- MPs Airtable's (airtable-mps.json), by the same IDs, so an import writes
-- the same rows again rather than doubling them. The letters go to the test
-- MPs (lib/test-mps.json), which must be in the database already.
-- Supporters and their links are written as the matcher
-- (lib/server/supporters.ts) would make them: one per email.

-- Staff: the migration's admin, someone who may see supporters, and someone with an account alone.
INSERT INTO staff_accounts (email, permissions, added_by, added_at) VALUES
  ('jo@pauseai.uk', '{supporters}', 'admin@pauseai.uk', '2026-10-01T09:00:00Z'),
  ('sam@pauseai.uk', '{}', 'admin@pauseai.uk', '2026-10-15T14:00:00Z');

-- The two MPs from the Airtable fixture, as the MP sync copies them; Polly has signed the letter to the PM.
INSERT INTO politicians (airtable_id, house, name, salutation, constituency, party, email, created_at, updated_at) VALUES
  ('recDummy', 'commons', 'Ms Dora Dummy', 'Ms Dummy', 'Hackney North and Stoke Newington', 'Labour', 'mp90001.office@parliament.uk', '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z'),
  ('recPlaceholder', 'commons', 'Polly Placeholder', 'Ms Placeholder', 'Cities of London and Westminster', 'Labour (Co-op)', 'polly.placeholder.mp@parliament.uk', '2026-09-01T00:00:00Z', '2026-10-12T00:00:00Z');
INSERT INTO campaign_statuses (politician_id, campaign, status, status_date, note, updated_by, updated_at)
SELECT id, 'regulate-letter-pm', 'signed', '2026-10-01', 'Told us at the march', 'jo@pauseai.uk', '2026-10-02T10:00:00Z' FROM politicians WHERE airtable_id = 'recPlaceholder';

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

-- Letters: one from Jane, who is also on Luma, answered by the MP; one from Lee, who is nowhere
-- else; one to Bouncy McTestface MP, whose address doesn't exist, that bounced and blocked it;
-- one answered by an out-of-office; one never sent.
INSERT INTO letters (campaign, politician_id, sender_name, sender_email, sender_address, sender_postcode, contact_consent, subject, reply_hash, status, created_at, sent_at, replied_at)
SELECT 'regulate-letter-pm', id, 'Jane Fixture', 'Jane.Fixture@example.com', '1 Fixture Street, Manchester', 'M1 1AE', true, 'Please back a pause on frontier AI', 'fixture-letter-jane', 'sent', '2026-10-02T10:00:00Z', '2026-10-02T10:00:05Z', '2026-10-09T15:30:00Z'
FROM politicians WHERE test_postcode = 'ZZ99ZZ';
INSERT INTO letters (campaign, politician_id, sender_name, sender_email, sender_address, sender_postcode, contact_consent, subject, reply_hash, status, created_at, sent_at)
SELECT 'regulate-letter-pm', id, 'Lee Letter', 'lee.letter@example.com', '2 Fixture Road, Bristol', 'BS1 1AA', false, 'AI safety matters to your constituents', 'fixture-letter-lee', 'sent', '2026-10-18T09:00:00Z', '2026-10-18T09:00:04Z'
FROM politicians WHERE test_postcode = 'ZZ99ZS';
INSERT INTO letters (campaign, politician_id, sender_name, sender_email, sender_address, sender_postcode, contact_consent, subject, reply_hash, status, created_at, sent_at)
SELECT 'regulate-letter-pm', id, 'Bo Bounce', 'bo.bounce@example.com', '3 Fixture Lane, Leeds', 'LS1 1AA', true, 'Please support a pause', 'fixture-letter-bo', 'bounced', '2026-10-12T09:00:00Z', '2026-10-12T09:00:03Z'
FROM politicians WHERE test_postcode = 'ZZ99ZH';
INSERT INTO letters (campaign, politician_id, sender_name, sender_email, sender_address, sender_postcode, contact_consent, subject, reply_hash, status, created_at, sent_at)
SELECT 'support-sobel-bill', id, 'Sam Fixture', 'sam.fixture@example.com', '4 Fixture Way, Stratford', 'E15 1AA', true, 'Back the Sobel bill', 'fixture-letter-sam', 'sent', '2026-10-19T16:00:00Z', '2026-10-19T16:00:02Z'
FROM politicians WHERE test_postcode = 'ZZ99ZB';
INSERT INTO letters (campaign, politician_id, sender_name, sender_email, sender_address, sender_postcode, contact_consent, subject, reply_hash, status, created_at)
SELECT 'regulate-letter-pm', id, 'Nora Noaddress', 'nora@example.com', '5 Fixture Close, Norwich', 'NR1 1AA', false, 'A pause on frontier AI', 'fixture-letter-nora', 'not_sent', '2026-10-20T11:00:00Z'
FROM politicians WHERE test_postcode = 'ZZ99ZN';
INSERT INTO letter_events (letter_id, at, status) SELECT id, created_at, 'sending' FROM letters WHERE reply_hash LIKE 'fixture-letter-%';
INSERT INTO letter_events (letter_id, at, status) SELECT id, sent_at, 'sent' FROM letters WHERE reply_hash LIKE 'fixture-letter-%' AND sent_at IS NOT NULL;
INSERT INTO letter_events (letter_id, at, status, details) SELECT id, created_at + interval '1 second', 'not_sent', '{"reason": "The MP has no email address"}' FROM letters WHERE reply_hash = 'fixture-letter-nora';
INSERT INTO letter_events (letter_id, at, status, details) SELECT id, replied_at, 'replied', '{"from": "Testy McTestface MP"}' FROM letters WHERE reply_hash = 'fixture-letter-jane';
INSERT INTO letter_events (letter_id, at, status, details) SELECT id, sent_at + interval '2 minutes', 'auto_reply', '{"from": "Backy McTestface MP", "subject": "Out of office"}' FROM letters WHERE reply_hash = 'fixture-letter-sam';
INSERT INTO letter_events (letter_id, at, status, details) SELECT id, sent_at + interval '1 minute', 'bounced', '{"type": "HardBounce", "description": "The address does not exist"}' FROM letters WHERE reply_hash = 'fixture-letter-bo';

-- Bouncy's address, blocked by that bounce; and an address that complained, long ago.
INSERT INTO email_problems (id, at, address, message_id, kind, reason, can_reset, details) OVERRIDING SYSTEM VALUE VALUES
  (1, '2026-10-12T09:01:00Z', 'no-such-mailbox@pauseai.uk', 'fixture-message-bo', 'hard', 'The address does not exist', true, '{"type": "HardBounce"}'),
  (2, '2026-06-01T12:00:00Z', 'grumpy@example.com', 'fixture-message-grumpy', 'complaint', 'Marked as spam', false, '{}');
INSERT INTO email_blocks (address, problem_id) VALUES ('no-such-mailbox@pauseai.uk', 1), ('grumpy@example.com', 2);
INSERT INTO email_sends (at, purpose, letter_id, address, outcome, message_id)
SELECT sent_at, 'letter', id, 'no-such-mailbox@pauseai.uk', 'sent', 'fixture-message-bo' FROM letters WHERE reply_hash = 'fixture-letter-bo';

-- The import log: a Luma run that stopped short with events still waiting, after one that
-- finished; a nightly MP sync that changed nothing; a check that found a problem; a ControlAI
-- read that failed; the signatories never imported.
INSERT INTO import_runs (at, job, started_by, status, error, result) VALUES
  ('2026-10-19T17:17:00Z', 'import-luma', 'nightly', 'ok', NULL, '{"events": 9, "eventsSynced": 9, "eventsLeft": 0, "guestsChanged": 45, "people": 5, "contacts": 3, "supportersAdded": 6, "linked": 6, "requests": 21}'),
  ('2026-10-20T17:17:00Z', 'import-luma', 'nightly', 'ok', NULL, '{"events": 2, "eventsSynced": 6, "eventsLeft": 4, "guestsChanged": 12, "people": 1, "contacts": 0, "supportersAdded": 1, "linked": 1, "requests": 150, "stoppedBy": "rate-limit"}'),
  ('2026-10-20T00:00:00Z', 'sync-mps', 'nightly', 'unchanged', NULL, '{"changes": {"added": [], "removed": [], "changed": []}}'),
  ('2026-10-20T01:00:00Z', 'check-mps', 'nightly', 'ok', NULL, '{"problems": [{"kind": "email", "constituency": "Testshire", "name": "Testy McTestface MP", "airtable": null, "parliament": ["testy@parliament.uk"]}]}'),
  ('2026-10-20T02:00:00Z', 'import-controlai', 'nightly', 'failed', 'No PDF linked from the letter page', '{}');

-- Pat unsubscribed from the calendar's emails; Sam did too, then subscribed again.
INSERT INTO opt_outs (address, list, source, source_ref, unsubscribed_at, resubscribed_at) VALUES
  ('pat.fixture@example.com', 'luma-calendar', 'luma-webhook', 'fixture-unsubscribe-pat', '2026-10-12T08:00:00Z', NULL),
  ('sam.fixture@example.com', 'luma-calendar', 'luma-webhook', 'fixture-unsubscribe-sam', '2026-09-30T08:00:00Z', '2026-10-03T08:00:00Z');

-- The audit log: who did what, as the staff pages and the jobs log it.
INSERT INTO audit_log (at, actor, action, details) VALUES
  ('2026-09-01T00:00:00Z', 'sync', 'apply MP sync', '{"added": 2, "removed": 0, "changed": 0}'),
  ('2026-10-01T09:00:00Z', 'admin@pauseai.uk', 'add staff account', '{"email": "jo@pauseai.uk", "to": ["supporters"]}'),
  ('2026-10-02T10:00:00Z', 'jo@pauseai.uk', 'set status', '{"politicianId": 0, "campaign": "regulate-letter-pm", "status": "signed", "date": "2026-10-01", "note": "Told us at the march"}'),
  ('2026-10-12T09:01:00Z', 'postmark', 'block address', '{"address": "no-such-mailbox@pauseai.uk", "kind": "hard"}'),
  ('2026-10-15T14:00:00Z', 'admin@pauseai.uk', 'add staff account', '{"email": "sam@pauseai.uk", "to": []}'),
  ('2026-10-20T02:00:00Z', 'nightly', 'import ControlAI letter', '{"error": "No PDF linked from the letter page"}'),
  ('2026-10-20T10:00:00Z', 'jo@pauseai.uk', 'view supporter', '{"id": 1}');
UPDATE audit_log SET details = jsonb_set(details, '{politicianId}', to_jsonb((SELECT id FROM politicians WHERE airtable_id = 'recPlaceholder')))
WHERE action = 'set status';

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
