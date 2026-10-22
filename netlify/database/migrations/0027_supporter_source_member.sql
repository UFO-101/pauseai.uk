-- Members are a source of supporters (lib/server/supporter-sources.ts):
-- a member's record links to a supporter by email, like a Luma user or a
-- letter, and provides the same three views. Contact details gain a city,
-- which members give, and the summary says whether the supporter is a
-- member now, not one removed.

ALTER TABLE supporter_links ADD COLUMN member_id text UNIQUE REFERENCES members (id) ON DELETE CASCADE;
ALTER TABLE supporter_links DROP CONSTRAINT supporter_links_check;
ALTER TABLE supporter_links ADD CONSTRAINT supporter_links_check CHECK (num_nonnulls(luma_user_id, letter_id, member_id) = 1);

-- First seen when they first joined PauseAI.
CREATE VIEW supporter_source_member AS
  SELECT m.id AS source_id, m.email, m.name, m.joined_at AS seen_at FROM members m;

-- Joining: `detail` is the site the join form was on, `title` what they chose
-- to do, `href` their record in Airtable.
CREATE VIEW supporter_activity_member AS
  SELECT m.id AS source_id, m.joined_at AS at, 'member-joined' AS kind, m.intent AS title, m.source_page AS detail,
    'https://airtable.com/appWPTGqZmUcs3NWu/tblL1icZBhTV1gQ9o/' || m.id AS href, NULL::text AS status
  FROM members m;

-- What they gave on the join form, when this record was made.
CREATE VIEW supporter_contact_member AS
  SELECT m.id AS source_id, m.created_at AS at, m.phone, m.postcode,
    NULL::double precision AS latitude, NULL::double precision AS longitude, m.city
  FROM members m;

-- A city, after the other columns, as a view can only gain columns at its end:
-- an event's for Luma, none for a letter.
CREATE OR REPLACE VIEW supporter_contact_luma AS
  SELECT g.user_id AS source_id, g.registered_at AS at, g.phone, g.postcode, e.latitude, e.longitude, e.city
  FROM luma_guests g JOIN luma_events e ON e.id = g.event_id;
CREATE OR REPLACE VIEW supporter_contact_letter AS
  SELECT l.id AS source_id, l.created_at AS at, NULL::text AS phone, l.sender_postcode AS postcode,
    NULL::double precision AS latitude, NULL::double precision AS longitude, NULL::text AS city
  FROM letters l;

CREATE OR REPLACE VIEW supporter_activity AS
  SELECT k.supporter_id, 'luma' AS source, a.at, a.kind, a.title, a.detail, a.href, a.status
  FROM supporter_activity_luma a JOIN supporter_links k ON k.luma_user_id = a.source_id
  UNION ALL
  SELECT k.supporter_id, 'letter', a.at, a.kind, a.title, a.detail, a.href, a.status
  FROM supporter_activity_letter a JOIN supporter_links k ON k.letter_id = a.source_id
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
  SELECT k.supporter_id, 'letter', c.at, c.phone, c.postcode, c.latitude, c.longitude, c.city
  FROM supporter_contact_letter c JOIN supporter_links k ON k.letter_id = c.source_id
  UNION ALL
  SELECT k.supporter_id, 'member', c.at, c.phone, c.postcode, c.latitude, c.longitude, c.city
  FROM supporter_contact_member c JOIN supporter_links k ON k.member_id = c.source_id;

CREATE OR REPLACE VIEW supporter_identity AS
  SELECT k.supporter_id, 'luma' AS source, s.email, s.name, s.seen_at
  FROM supporter_source_luma s JOIN supporter_links k ON k.luma_user_id = s.source_id
  UNION ALL
  SELECT k.supporter_id, 'letter', s.email, s.name, s.seen_at
  FROM supporter_source_letter s JOIN supporter_links k ON k.letter_id = s.source_id
  UNION ALL
  SELECT k.supporter_id, 'member', s.email, s.name, s.seen_at
  FROM supporter_source_member s JOIN supporter_links k ON k.member_id = s.source_id;

-- As before, and then whether they're a member now: a record not removed.
CREATE OR REPLACE VIEW supporters_summary AS
WITH ident AS (
  SELECT supporter_id,
    (array_agg(name ORDER BY seen_at DESC NULLS LAST, name) FILTER (WHERE name <> ''))[1] AS name,
    array_agg(DISTINCT email ORDER BY email) AS emails,
    array_agg(DISTINCT source ORDER BY source) AS sources,
    min(seen_at) AS first_seen_at
  FROM supporter_identity GROUP BY supporter_id
), act AS (
  SELECT supporter_id,
    bool_or(kind = 'luma-contact') AS luma_contact,
    max(at) AS last_active_at,
    (count(*) FILTER (WHERE kind = 'luma-registered' AND detail <> 'declined'))::int AS events,
    (count(*) FILTER (WHERE kind = 'letter'))::int AS letters
  FROM supporter_activity GROUP BY supporter_id
), contact AS (
  SELECT supporter_id,
    (array_agg(phone ORDER BY at DESC, phone) FILTER (WHERE phone IS NOT NULL))[1] AS phone,
    (array_agg(postcode ORDER BY at DESC, postcode) FILTER (WHERE postcode IS NOT NULL))[1] AS postcode
  FROM supporter_contact GROUP BY supporter_id
), opted AS (
  SELECT i.supporter_id, array_agg(DISTINCT o.list ORDER BY o.list) AS opted_out
  FROM supporter_identity i JOIN opt_outs o ON o.address = i.email AND o.resubscribed_at IS NULL
  GROUP BY i.supporter_id
), mem AS (
  SELECT DISTINCT k.supporter_id
  FROM supporter_links k JOIN members m ON m.id = k.member_id WHERE m.removed_at IS NULL
)
SELECT s.id, ident.name, ident.emails, contact.phone, contact.postcode, ident.sources,
  coalesce(act.luma_contact, false) AS luma_contact, ident.first_seen_at, act.last_active_at,
  coalesce(act.events, 0) AS events, coalesce(act.letters, 0) AS letters, opted.opted_out,
  mem.supporter_id IS NOT NULL AS member
FROM supporters s
LEFT JOIN ident ON ident.supporter_id = s.id
LEFT JOIN act ON act.supporter_id = s.id
LEFT JOIN contact ON contact.supporter_id = s.id
LEFT JOIN opted ON opted.supporter_id = s.id
LEFT JOIN mem ON mem.supporter_id = s.id;
