-- Everyone we campaign at is a notable person, and every letter to one is a
-- letter. Each parent table holds what all its kinds share, and a child
-- table adds what only its kind has, one to one: politicians for notable
-- people; supporter_letters for letters (PauseAI's own letters come
-- later). A child joins its parent by a composite foreign key (id, kind),
-- so it can only be the kind its parent says, and everything else points at
-- the parent, so a new kind adds a child table and changes nothing else.
--
-- What we ask people to do, and whose answer we record, is an ask: sign a
-- letter, come to an event. A campaign is one letter many supporters send,
-- for an ask or for none, and a status is one person's answer to one ask.

-- ------------------------------------------------------------ notable people

-- `name` is how they're known in public, with any title that's part of it
-- ("Lord McFall of Alcluith"); `salutation` follows "Dear". Forename and
-- surname are for sorting and mail merge, both or neither: a peer has only
-- their title. One who leaves office is marked by `status`, never deleted.
-- `airtable_removed_at` is when a record copied from Airtable was no longer
-- there.
CREATE TABLE notable_people (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('politician')),
  name text NOT NULL,
  forename text,
  surname text,
  salutation text NOT NULL DEFAULT '',
  email text,
  status text NOT NULL DEFAULT 'in_office' CHECK (status IN ('in_office', 'died', 'retired', 'left_office')),
  notes text NOT NULL DEFAULT '',
  important_target boolean NOT NULL DEFAULT false,
  personal_connection boolean NOT NULL DEFAULT false,
  airtable_id text UNIQUE,
  airtable_removed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, kind),
  CHECK ((forename IS NULL) = (surname IS NULL)),
  CHECK (forename IS NULL OR (forename <> '' AND surname <> '')),
  CHECK (airtable_removed_at IS NULL OR airtable_id IS NOT NULL)
);

-- The same IDs, so staff pages' links and the audit log still find them.
INSERT INTO notable_people (id, kind, name, salutation, email, status, airtable_id, created_at, updated_at)
  OVERRIDING SYSTEM VALUE
  SELECT id, 'politician', name, salutation, email, CASE WHEN sitting THEN 'in_office' ELSE 'left_office' END,
    airtable_id, created_at, updated_at
  FROM politicians;
SELECT setval(pg_get_serial_sequence('notable_people', 'id'), coalesce(max(id), 0) + 1, false) FROM notable_people;

-- ------------------------------------------------------------------- asks

-- The statuses each kind of ask allows. A new status is a row here.
CREATE TABLE ask_kind_statuses (
  kind text NOT NULL CHECK (kind IN ('letter', 'event')),
  status text NOT NULL,
  PRIMARY KEY (kind, status)
);
INSERT INTO ask_kind_statuses (kind, status) VALUES
  ('letter', 'signed'),
  -- They'll be there; probably, not confirmed; a member of their staff
  -- comes instead; their staff probably come; no; no, but they offered the
  -- constituent a surgery appointment; they passed the invitation on.
  ('event', 'going'),
  ('event', 'tentative'),
  ('event', 'meeting_staff'),
  ('event', 'tentative_staff'),
  ('event', 'declined'),
  ('event', 'declined_surgery'),
  ('event', 'passed_on');

-- `date` is the event's, or the letter's: when it was published, or first
-- asked for. `url` is where to read it or see the event: a page of ours, by
-- its path, or another site's. `asked_by` is who asks it: supporters, in
-- their letters or in person, PauseAI, in its own emails, and ControlAI.
CREATE TABLE asks (
  slug text PRIMARY KEY CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('letter', 'event')),
  date date,
  url text CHECK (url ~ '^(https://|/)'),
  asked_by text[] NOT NULL DEFAULT '{}' CHECK (asked_by <@ ARRAY['supporters', 'pauseai', 'controlai']),
  UNIQUE (slug, kind)
);
INSERT INTO asks (slug, title, kind, date, url, asked_by) VALUES
  ('frontier-ai-letter', 'Frontier AI letter to the Prime Minister', 'letter', '2026-06-18',
    '/pdfs/Frontier-AI-Open-Letter.pdf', '{supporters}'),
  ('deepmind-letter', 'DeepMind letter to Sir Demis Hassabis', 'letter', '2025-08-29',
    '/campaigns/dear-sir-demis-2025', '{supporters}'),
  ('controlai-statement', 'ControlAI''s campaign statement', 'letter', '2025-02-06',
    'https://controlai.org/statement', '{controlai}'),
  ('controlai-letter', 'ControlAI''s letter to the Prime Minister', 'letter', '2026-09-11',
    'https://controlai.org/uk-pm-letter', '{controlai}'),
  ('edinburgh-conference-2026', 'Edinburgh conference, November 2026', 'event', '2026-11-01',
    'https://luma.com/6jp2nqe9', '{pauseai}'),
  ('go-to-parliament-oct-2026', 'Constituent meetings at Parliament, October 2026', 'event', '2026-10-20',
    'https://luma.com/pauseai-0g9r', '{supporters}');

-- One letter many supporters send, and the ask it makes, if any. Its words
-- are in code (lib/content/email-your-mp.ts), or nowhere for the old
-- campaigns of pauseai.info's web form.
CREATE TABLE campaigns (
  slug text PRIMARY KEY CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text NOT NULL,
  ask text REFERENCES asks (slug)
);
INSERT INTO campaigns (slug, title, ask) VALUES
  ('regulate-letter-pm', 'Regulate AI developers now', 'frontier-ai-letter'),
  ('support-sobel-bill', 'Support the Artificial Superintelligence Bill', NULL),
  ('pauseai-info-frontier-ai', 'Frontier AI letter, from pauseai.info', 'frontier-ai-letter'),
  ('pauseai-info-liability', 'Liability letter, from pauseai.info', NULL),
  ('pauseai-info-deepmind', 'DeepMind letter, from pauseai.info', 'deepmind-letter');
-- Any campaign a letter names that isn't one of those, under its slug.
INSERT INTO campaigns (slug, title) SELECT DISTINCT campaign, campaign FROM letters ON CONFLICT DO NOTHING;

-- One person's answer to one ask: no answer, no row. `updated_by` is who
-- set it, a staff email or an import ('airtable', 'controlai'), and an
-- import changes only its own. The ask's kind is repeated here so the
-- foreign key on (ask_kind, status) allows only that kind's statuses.
CREATE TABLE ask_statuses (
  notable_person_id bigint NOT NULL REFERENCES notable_people (id) ON DELETE CASCADE,
  ask text NOT NULL,
  ask_kind text NOT NULL,
  status text NOT NULL,
  status_date date,
  note text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL,
  PRIMARY KEY (notable_person_id, ask),
  FOREIGN KEY (ask, ask_kind) REFERENCES asks (slug, kind),
  FOREIGN KEY (ask_kind, status) REFERENCES ask_kind_statuses (kind, status)
);
CREATE INDEX ask_statuses_ask ON ask_statuses (ask, status);

-- Statuses were kept by campaign: each campaign's ask, under the slugs it
-- has had. A status for a campaign with no ask is for an ask of its own.
CREATE TEMP TABLE status_asks AS
  SELECT DISTINCT s.campaign,
    CASE WHEN s.campaign IN ('regulate-letter-pm', 'letter-to-the-prime-minister') THEN 'frontier-ai-letter'
      WHEN s.campaign IN ('support-sobel-bill', 'support-the-bill') THEN 'controlai-letter'
      ELSE s.campaign END AS ask
  FROM campaign_statuses s;
INSERT INTO asks (slug, title, kind)
  SELECT ask, ask, 'letter' FROM status_asks ON CONFLICT DO NOTHING;
INSERT INTO ask_statuses (notable_person_id, ask, ask_kind, status, status_date, note, updated_at, updated_by)
  SELECT DISTINCT ON (s.politician_id, a.ask) s.politician_id, a.ask, 'letter', s.status, s.status_date, s.note,
    s.updated_at, s.updated_by
  FROM campaign_statuses s JOIN status_asks a USING (campaign)
  ORDER BY s.politician_id, a.ask, s.updated_at DESC;
DROP TABLE status_asks;
DROP TABLE campaign_statuses;

-- --------------------------------------------------------------- letters

-- A supporter's letter: the campaign, and who sent it. The letter's text
-- isn't kept. `reply_hash` is the mailbox of the letter's own address.
CREATE TABLE supporter_letters (
  id bigint PRIMARY KEY,
  kind text NOT NULL DEFAULT 'supporter' CHECK (kind = 'supporter'),
  campaign text NOT NULL REFERENCES campaigns (slug),
  sender_name text NOT NULL,
  sender_email text NOT NULL,
  sender_address text NOT NULL,
  sender_postcode text NOT NULL,
  contact_consent boolean NOT NULL,
  subject text NOT NULL,
  reply_hash text NOT NULL UNIQUE
);
INSERT INTO supporter_letters (id, campaign, sender_name, sender_email, sender_address, sender_postcode,
    contact_consent, subject, reply_hash)
  SELECT id, campaign, sender_name, sender_email, sender_address, sender_postcode, contact_consent, subject, reply_hash
  FROM letters;
CREATE INDEX supporter_letters_sender_address ON supporter_letters (lower(trim(sender_email)));
CREATE INDEX supporter_letters_sender_email_campaign ON supporter_letters (lower(sender_email), campaign);

ALTER TABLE letters ADD COLUMN kind text NOT NULL DEFAULT 'supporter' CHECK (kind IN ('supporter'));
ALTER TABLE letters ALTER COLUMN kind DROP DEFAULT;
ALTER TABLE letters ADD CONSTRAINT letters_id_kind_key UNIQUE (id, kind);
ALTER TABLE supporter_letters ADD CONSTRAINT supporter_letters_letter_fkey
  FOREIGN KEY (id, kind) REFERENCES letters (id, kind) ON DELETE CASCADE;
ALTER TABLE letters RENAME COLUMN politician_id TO notable_person_id;
ALTER TABLE letters DROP CONSTRAINT letters_politician_id_fkey;
ALTER TABLE letters ADD CONSTRAINT letters_notable_person_id_fkey
  FOREIGN KEY (notable_person_id) REFERENCES notable_people (id);
CREATE INDEX letters_notable_person ON letters (notable_person_id);

ALTER TABLE supporter_links DROP CONSTRAINT supporter_links_letter_id_fkey;
ALTER TABLE supporter_links ADD CONSTRAINT supporter_links_letter_id_fkey
  FOREIGN KEY (letter_id) REFERENCES supporter_letters (id) ON DELETE CASCADE;

-- The views over letters read the sender from supporter_letters, with the
-- same columns, so the views built on them stand.
CREATE OR REPLACE VIEW supporter_source_letter AS
  SELECT s.id AS source_id, lower(trim(s.sender_email)) AS email, s.sender_name AS name, l.created_at AS seen_at
  FROM supporter_letters s JOIN letters l ON l.id = s.id;
CREATE OR REPLACE VIEW supporter_activity_letter AS
  SELECT s.id AS source_id, l.created_at AS at, 'letter'::text AS kind, s.campaign AS title, p.name AS detail,
    '/staff/politicians/' || p.id AS href, l.status
  FROM supporter_letters s JOIN letters l ON l.id = s.id JOIN notable_people p ON p.id = l.notable_person_id
  UNION ALL
  SELECT s.id, l.replied_at, 'letter-replied', s.campaign, p.name, '/staff/politicians/' || p.id, NULL::text
  FROM supporter_letters s JOIN letters l ON l.id = s.id JOIN notable_people p ON p.id = l.notable_person_id
  WHERE l.replied_at IS NOT NULL;
CREATE OR REPLACE VIEW supporter_contact_letter AS
  SELECT s.id AS source_id, l.created_at AS at, NULL::text AS phone, s.sender_postcode AS postcode,
    NULL::double precision AS latitude, NULL::double precision AS longitude, NULL::text AS city
  FROM supporter_letters s JOIN letters l ON l.id = s.id;
CREATE OR REPLACE VIEW email_permissions AS
  SELECT t.topic, t.address, d.send, d.reason, d.at, d.source
  FROM (
    SELECT 'luma-calendar' AS topic, email AS address FROM luma_people
    UNION SELECT 'pauseai-updates', email FROM members
    UNION SELECT 'events-and-ways-to-help', lower(trim(sender_email)) FROM supporter_letters
    UNION SELECT list, address FROM opt_outs WHERE resubscribed_at IS NULL
  ) t
  CROSS JOIN LATERAL email_permission(t.topic, t.address) d;

-- As in 0034, but the consent box is the newest supporter letter's.
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
  -- The consent box on the newest letter.
  SELECT 3, CASE WHEN l.contact_consent THEN 'yes' ELSE 'no' END,
    CASE WHEN l.contact_consent THEN 'asked' ELSE 'declined' END, l.created_at, 'letter'
  FROM (SELECT s.contact_consent, l.created_at FROM supporter_letters s JOIN letters l ON l.id = s.id
        WHERE lower(trim(s.sender_email)) = for_address
        ORDER BY l.created_at DESC, l.id DESC LIMIT 1) l
  WHERE for_topic = 'events-and-ways-to-help'
) r (rank, send, reason, at, source)
ORDER BY r.rank LIMIT 1
$$;

DROP INDEX letters_sender_address;
DROP INDEX letters_sender_email_campaign;
ALTER TABLE letters DROP COLUMN campaign, DROP COLUMN sender_name, DROP COLUMN sender_email,
  DROP COLUMN sender_address, DROP COLUMN sender_postcode, DROP COLUMN contact_consent, DROP COLUMN subject,
  DROP COLUMN reply_hash;

-- ----------------------------------------------------------- politicians

-- What only a politician has. Their house, constituency, party and country.
-- A test MP is found by their made-up postcode (lib/test-mps.json).
ALTER TABLE politicians ALTER COLUMN id DROP IDENTITY;
ALTER TABLE politicians ADD COLUMN kind text NOT NULL DEFAULT 'politician' CHECK (kind = 'politician');
ALTER TABLE politicians ADD CONSTRAINT politicians_notable_person_fkey
  FOREIGN KEY (id, kind) REFERENCES notable_people (id, kind) ON DELETE CASCADE;
ALTER TABLE politicians ADD COLUMN country text
  CHECK (country IN ('england', 'scotland', 'wales', 'northern-ireland'));
ALTER TABLE politicians ADD COLUMN city text;
DROP INDEX politicians_sitting_constituency;
ALTER TABLE politicians DROP COLUMN name, DROP COLUMN salutation, DROP COLUMN email, DROP COLUMN sitting,
  DROP COLUMN airtable_id, DROP COLUMN created_at, DROP COLUMN updated_at;
CREATE INDEX politicians_commons_constituency ON politicians (constituency) WHERE house = 'commons';
