-- A form entry is one person filling in one of our forms once: who they
-- are, how to reach them, and whether they ticked the box to hear from us.
-- `form` says which form. What only some forms have hangs off the entry,
-- one to one: a letter's sender is the entry its supporter_letters row
-- points at. Entries, not letters, are the supporter source, so every
-- form's people are supporters the same way.

CREATE TABLE form_entries (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  form text NOT NULL CHECK (form IN ('email-your-mp', 'web-form')),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  address text,
  city text,
  postcode text,
  contact_consent boolean NOT NULL,
  utm_source text
);
CREATE INDEX form_entries_email ON form_entries (lower(trim(email)));

-- Each letter's sender becomes an entry with the letter's ID, so a
-- supporter's link to the letter becomes the link to its entry. The old
-- form's letters left address, and sometimes postcode, blank.
INSERT INTO form_entries (id, form, created_at, name, email, address, postcode, contact_consent)
  OVERRIDING SYSTEM VALUE
  SELECT s.id, CASE WHEN s.airtable_id IS NULL THEN 'email-your-mp' ELSE 'web-form' END, l.created_at,
    s.sender_name, s.sender_email, nullif(s.sender_address, ''), nullif(s.sender_postcode, ''), s.contact_consent
  FROM supporter_letters s JOIN letters l ON l.id = s.id;
SELECT setval(pg_get_serial_sequence('form_entries', 'id'), (SELECT max(id) FROM form_entries))
  WHERE EXISTS (SELECT 1 FROM form_entries);

-- No cascade from an entry: erasing one deletes its letter first, which
-- takes its supporter_letters row with it.
ALTER TABLE supporter_letters ADD COLUMN entry_id bigint UNIQUE REFERENCES form_entries (id);
UPDATE supporter_letters SET entry_id = id;
ALTER TABLE supporter_letters ALTER COLUMN entry_id SET NOT NULL;

ALTER TABLE supporter_links ADD COLUMN form_entry_id bigint UNIQUE REFERENCES form_entries (id) ON DELETE CASCADE;
UPDATE supporter_links SET form_entry_id = letter_id WHERE letter_id IS NOT NULL;

-- ------------------------------------------------------------ the source

-- First seen when they filled the form in.
CREATE VIEW supporter_source_form AS
  SELECT f.id AS source_id, lower(trim(f.email)) AS email, f.name, f.created_at AS seen_at FROM form_entries f;

-- A letter, and its reply, as before; an entry without a letter is a line of
-- its own, titled by its form, with where they came from as its detail.
CREATE VIEW supporter_activity_form AS
  SELECT s.entry_id AS source_id, l.created_at AS at, 'letter' AS kind, s.campaign AS title, p.name AS detail,
    '/staff/politicians/' || p.id AS href, l.status
  FROM supporter_letters s JOIN letters l ON l.id = s.id JOIN notable_people p ON p.id = l.notable_person_id
  UNION ALL
  SELECT s.entry_id, l.replied_at, 'letter-replied', s.campaign, p.name, '/staff/politicians/' || p.id, NULL::text
  FROM supporter_letters s JOIN letters l ON l.id = s.id JOIN notable_people p ON p.id = l.notable_person_id
  WHERE l.replied_at IS NOT NULL
  UNION ALL
  SELECT f.id, f.created_at, 'form-entry', f.form, f.utm_source, NULL::text, NULL::text
  FROM form_entries f WHERE NOT EXISTS (SELECT 1 FROM supporter_letters s WHERE s.entry_id = f.id);

CREATE VIEW supporter_contact_form AS
  SELECT f.id AS source_id, f.created_at AS at, f.phone, f.postcode,
    NULL::double precision AS latitude, NULL::double precision AS longitude, f.city
  FROM form_entries f;

-- The unions, with the form's arm where the letter's was. Its source is the
-- form, as the letter's was "letter" or, for the old form, "web-form".
CREATE OR REPLACE VIEW supporter_identity AS
  SELECT k.supporter_id, 'luma' AS source, s.email, s.name, s.seen_at
  FROM supporter_source_luma s JOIN supporter_links k ON k.luma_user_id = s.source_id
  UNION ALL
  SELECT k.supporter_id, f.form, s.email, s.name, s.seen_at
  FROM supporter_source_form s JOIN supporter_links k ON k.form_entry_id = s.source_id
    JOIN form_entries f ON f.id = s.source_id
  UNION ALL
  SELECT k.supporter_id, 'member', s.email, s.name, s.seen_at
  FROM supporter_source_member s JOIN supporter_links k ON k.member_id = s.source_id;

CREATE OR REPLACE VIEW supporter_activity AS
  SELECT k.supporter_id, 'luma' AS source, a.at, a.kind, a.title, a.detail, a.href, a.status
  FROM supporter_activity_luma a JOIN supporter_links k ON k.luma_user_id = a.source_id
  UNION ALL
  SELECT k.supporter_id, f.form, a.at, a.kind, a.title, a.detail, a.href, a.status
  FROM supporter_activity_form a JOIN supporter_links k ON k.form_entry_id = a.source_id
    JOIN form_entries f ON f.id = a.source_id
  UNION ALL
  SELECT k.supporter_id, o.source, o.unsubscribed_at, 'opted-out', o.list, o.address, NULL, NULL
  FROM opt_outs o JOIN (SELECT DISTINCT supporter_id, matched_value FROM supporter_links) k ON k.matched_value = o.address
  UNION ALL
  SELECT k.supporter_id, o.source, o.resubscribed_at, 'resubscribed', o.list, o.address, NULL, NULL
  FROM opt_outs o JOIN (SELECT DISTINCT supporter_id, matched_value FROM supporter_links) k ON k.matched_value = o.address
  WHERE o.resubscribed_at IS NOT NULL
  UNION ALL
  SELECT k.supporter_id, 'member', a.at, a.kind, a.title, a.detail, a.href, a.status
  FROM supporter_activity_member a JOIN supporter_links k ON k.member_id = a.source_id;

CREATE OR REPLACE VIEW supporter_contact AS
  SELECT k.supporter_id, 'luma' AS source, c.at, c.phone, c.postcode, c.latitude, c.longitude, c.city
  FROM supporter_contact_luma c JOIN supporter_links k ON k.luma_user_id = c.source_id
  UNION ALL
  SELECT k.supporter_id, f.form, c.at, c.phone, c.postcode, c.latitude, c.longitude, c.city
  FROM supporter_contact_form c JOIN supporter_links k ON k.form_entry_id = c.source_id
    JOIN form_entries f ON f.id = c.source_id
  UNION ALL
  SELECT k.supporter_id, 'member', c.at, c.phone, c.postcode, c.latitude, c.longitude, c.city
  FROM supporter_contact_member c JOIN supporter_links k ON k.member_id = c.source_id;

-- ------------------------------------------------------------ consent

-- The box on any of our forms is one topic, site-forms: the newest entry's
-- box says.
CREATE OR REPLACE VIEW email_permissions AS
  SELECT t.topic, t.address, d.send, d.reason, d.at, d.source
  FROM (
    SELECT 'luma-calendar' AS topic, email AS address FROM luma_people
    UNION SELECT 'pauseai-updates', email FROM members
    UNION SELECT 'site-forms', lower(trim(email)) FROM form_entries
    UNION SELECT list, address FROM opt_outs WHERE resubscribed_at IS NULL
  ) t
  CROSS JOIN LATERAL email_permission(t.topic, t.address) d;

CREATE OR REPLACE FUNCTION email_permission(for_topic text, for_address text)
RETURNS TABLE (send text, reason text, at timestamptz, source text)
LANGUAGE sql STABLE AS $$
SELECT r.send, r.reason, r.at, r.source FROM (
  -- A block overrides everything.
  SELECT 1, 'no', 'blocked', p.at, p.kind
  FROM email_blocks b JOIN email_problems p ON p.id = b.problem_id WHERE b.address = for_address
  UNION ALL
  -- Then an opt-out in force.
  SELECT 2, 'no', 'unsubscribed', o.unsubscribed_at, o.source
  FROM opt_outs o WHERE o.address = for_address AND o.list = for_topic AND o.resubscribed_at IS NULL
  UNION ALL
  -- A contact of the calendar.
  SELECT 3, 'yes', 'following', f.since, 'luma'
  FROM (SELECT min(l.contact_since) AS since FROM luma_people l WHERE l.email = for_address) f
  WHERE for_topic = 'luma-calendar' AND f.since IS NOT NULL
  UNION ALL
  SELECT 4, 'no', 'not-following', NULL, NULL WHERE for_topic = 'luma-calendar'
  UNION ALL
  -- The newest member record, one still shared before one removed. Every
  -- yes is unsure: the updates are sent from CiviCRM, whose unsubscribes
  -- we don't read.
  SELECT 3,
    CASE WHEN m.removed_at IS NOT NULL THEN 'no'
      WHEN m.created_at < '2026-06-30T00:00:00Z' OR m.keep_informed THEN 'unsure' ELSE 'no' END,
    CASE WHEN m.removed_at IS NOT NULL THEN 'removed'
      WHEN m.created_at < '2026-06-30T00:00:00Z' THEN 'joined'
      WHEN m.keep_informed THEN 'asked' ELSE 'declined' END,
    m.created_at, 'member'
  FROM (SELECT * FROM members m WHERE m.email = for_address
        ORDER BY m.removed_at IS NOT NULL, m.created_at DESC, m.id LIMIT 1) m
  WHERE for_topic = 'pauseai-updates'
  UNION ALL
  -- The box on the newest form entry.
  SELECT 3, CASE WHEN f.contact_consent THEN 'yes' ELSE 'no' END,
    CASE WHEN f.contact_consent THEN 'asked' ELSE 'declined' END, f.created_at, f.form
  FROM (SELECT * FROM form_entries f WHERE lower(trim(f.email)) = for_address
        ORDER BY f.created_at DESC, f.id DESC LIMIT 1) f
  WHERE for_topic = 'site-forms'
) r (rank, send, reason, at, source)
ORDER BY r.rank LIMIT 1
$$;

-- ------------------------------------------------------------ what goes

DROP VIEW supporter_source_letter, supporter_activity_letter, supporter_contact_letter;

ALTER TABLE supporter_links DROP CONSTRAINT supporter_links_check;
ALTER TABLE supporter_links DROP COLUMN letter_id;
ALTER TABLE supporter_links ADD CONSTRAINT supporter_links_check
  CHECK (num_nonnulls(luma_user_id, form_entry_id, member_id) = 1);

ALTER TABLE supporter_letters DROP COLUMN sender_name, DROP COLUMN sender_email, DROP COLUMN sender_address,
  DROP COLUMN sender_postcode, DROP COLUMN contact_consent;
