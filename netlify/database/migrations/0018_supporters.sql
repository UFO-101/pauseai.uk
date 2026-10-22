-- Supporters: one row per person, tied to each source record about them (a
-- Luma user, a letter) by supporter_links, matched by email
-- (lib/server/supporters.ts). The supporter holds nothing itself: name,
-- emails, phone and places come from the linked records, through the views
-- below, which every source provides in the same shape
-- (lib/server/supporter-sources.ts).

CREATE TABLE supporters (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Which supporter each source record belongs to. One row per record, through
-- a foreign key column for the record's table, so a link goes when its
-- record does.
CREATE TABLE supporter_links (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  supporter_id bigint NOT NULL REFERENCES supporters (id) ON DELETE CASCADE,
  luma_user_id text UNIQUE REFERENCES luma_people (user_id) ON DELETE CASCADE,
  letter_id bigint UNIQUE REFERENCES letters (id) ON DELETE CASCADE,
  -- Why the record is this supporter's: the rule, and the value it matched on.
  matched_by text NOT NULL CHECK (matched_by IN ('email')),
  -- The address, trimmed and lowercased.
  matched_value text NOT NULL CHECK (matched_value = lower(matched_value)),
  linked_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(luma_user_id, letter_id) = 1)
);
CREATE INDEX supporter_links_supporter ON supporter_links (supporter_id);
CREATE INDEX supporter_links_matched ON supporter_links (matched_by, matched_value);

-- Each source, for the matcher: its records with an email, a name and when
-- the person was first seen there.
CREATE VIEW supporter_source_luma AS
  SELECT p.user_id AS source_id, p.email, p.name,
    least(p.contact_since, (SELECT min(g.registered_at) FROM luma_guests g WHERE g.user_id = p.user_id)) AS seen_at
  FROM luma_people p;
CREATE VIEW supporter_source_letter AS
  SELECT l.id AS source_id, lower(trim(l.sender_email)) AS email, l.sender_name AS name, l.created_at AS seen_at
  FROM letters l;

-- Each source, for the history: what the person did, when. `detail` is the
-- status or who it was with; `href` where to see it.
CREATE VIEW supporter_activity_luma AS
  SELECT p.user_id AS source_id, p.contact_since AS at, 'luma-contact' AS kind, NULL::text AS title, NULL::text AS detail, NULL::text AS href
  FROM luma_people p WHERE p.contact_since IS NOT NULL
  UNION ALL
  SELECT g.user_id, g.registered_at, 'luma-registered', e.name, g.approval_status, 'https://luma.com/' || e.url
  FROM luma_guests g JOIN luma_events e ON e.id = g.event_id WHERE g.removed_at IS NULL;
CREATE VIEW supporter_activity_letter AS
  SELECT l.id AS source_id, l.created_at AS at, 'letter' AS kind, l.campaign AS title, p.name || ' · ' || l.status AS detail, '/staff/letters' AS href
  FROM letters l JOIN politicians p ON p.id = l.politician_id
  UNION ALL
  SELECT l.id, l.replied_at, 'letter-replied', l.campaign, p.name, '/staff/politicians/' || p.id
  FROM letters l JOIN politicians p ON p.id = l.politician_id WHERE l.replied_at IS NOT NULL;

-- Each source, for contact details and places: what the person gave, when.
CREATE VIEW supporter_contact_luma AS
  SELECT g.user_id AS source_id, g.registered_at AS at, g.phone, g.postcode, e.latitude, e.longitude
  FROM luma_guests g JOIN luma_events e ON e.id = g.event_id;
CREATE VIEW supporter_contact_letter AS
  SELECT l.id AS source_id, l.created_at AS at, NULL::text AS phone, l.sender_postcode AS postcode,
    NULL::double precision AS latitude, NULL::double precision AS longitude
  FROM letters l;

-- Every source's activity, by supporter, with the opt-outs on any of their
-- addresses.
CREATE VIEW supporter_activity AS
  SELECT k.supporter_id, 'luma' AS source, a.at, a.kind, a.title, a.detail, a.href
  FROM supporter_activity_luma a JOIN supporter_links k ON k.luma_user_id = a.source_id
  UNION ALL
  SELECT k.supporter_id, 'letter', a.at, a.kind, a.title, a.detail, a.href
  FROM supporter_activity_letter a JOIN supporter_links k ON k.letter_id = a.source_id
  UNION ALL
  SELECT k.supporter_id, o.source, o.unsubscribed_at, 'opted-out', o.list, o.address, NULL
  FROM opt_outs o JOIN (SELECT DISTINCT supporter_id, matched_value FROM supporter_links) k ON k.matched_value = o.address
  UNION ALL
  SELECT k.supporter_id, o.source, o.resubscribed_at, 'resubscribed', o.list, o.address, NULL
  FROM opt_outs o JOIN (SELECT DISTINCT supporter_id, matched_value FROM supporter_links) k ON k.matched_value = o.address
  WHERE o.resubscribed_at IS NOT NULL;

-- Every source's contact details and places, by supporter.
CREATE VIEW supporter_contact AS
  SELECT k.supporter_id, 'luma' AS source, c.at, c.phone, c.postcode, c.latitude, c.longitude
  FROM supporter_contact_luma c JOIN supporter_links k ON k.luma_user_id = c.source_id
  UNION ALL
  SELECT k.supporter_id, 'letter', c.at, c.phone, c.postcode, c.latitude, c.longitude
  FROM supporter_contact_letter c JOIN supporter_links k ON k.letter_id = c.source_id;

-- Every source's name and email, by supporter, with when the person was
-- first seen there.
CREATE VIEW supporter_identity AS
  SELECT k.supporter_id, 'luma' AS source, s.email, s.name, s.seen_at
  FROM supporter_source_luma s JOIN supporter_links k ON k.luma_user_id = s.source_id
  UNION ALL
  SELECT k.supporter_id, 'letter', s.email, s.name, s.seen_at
  FROM supporter_source_letter s JOIN supporter_links k ON k.letter_id = s.source_id;

-- One row per supporter, for the list: the newest name, every email, the
-- newest phone and postcode, the sources, first sign-up and last activity,
-- events registered for, letters, and the lists any of their addresses is
-- opted out of.
CREATE VIEW supporters_summary AS
  SELECT s.id,
    (SELECT i.name FROM supporter_identity i WHERE i.supporter_id = s.id AND i.name <> '' ORDER BY i.seen_at DESC NULLS LAST LIMIT 1) AS name,
    (SELECT array_agg(DISTINCT i.email ORDER BY i.email) FROM supporter_identity i WHERE i.supporter_id = s.id) AS emails,
    (SELECT c.phone FROM supporter_contact c WHERE c.supporter_id = s.id AND c.phone IS NOT NULL ORDER BY c.at DESC LIMIT 1) AS phone,
    (SELECT c.postcode FROM supporter_contact c WHERE c.supporter_id = s.id AND c.postcode IS NOT NULL ORDER BY c.at DESC LIMIT 1) AS postcode,
    (SELECT array_agg(DISTINCT i.source ORDER BY i.source) FROM supporter_identity i WHERE i.supporter_id = s.id) AS sources,
    EXISTS (SELECT 1 FROM supporter_activity a WHERE a.supporter_id = s.id AND a.kind = 'luma-contact') AS luma_contact,
    (SELECT min(i.seen_at) FROM supporter_identity i WHERE i.supporter_id = s.id) AS first_seen_at,
    (SELECT max(a.at) FROM supporter_activity a WHERE a.supporter_id = s.id) AS last_active_at,
    (SELECT count(*)::int FROM supporter_activity a WHERE a.supporter_id = s.id AND a.kind = 'luma-registered' AND a.detail <> 'declined') AS events,
    (SELECT count(*)::int FROM supporter_activity a WHERE a.supporter_id = s.id AND a.kind = 'letter') AS letters,
    (SELECT array_agg(DISTINCT o.list ORDER BY o.list) FROM opt_outs o
       WHERE o.resubscribed_at IS NULL AND o.address IN (SELECT i.email FROM supporter_identity i WHERE i.supporter_id = s.id)) AS opted_out
  FROM supporters s;
