-- When each supporter was first seen, kept on the supporter so the staff home
-- can count new supporters by it without working it out for everyone on each
-- load. supporter_first_seen says what it is; refreshSupporterFacts()
-- (lib/server/supporter-facts.ts) copies it onto supporters after each link.

-- The earliest any of their records saw them: a Luma contact or first
-- registration, a letter, joining. Every supporter, with null when no record
-- gives a time. A subquery per supporter, so asking for a few reads only
-- their records.
CREATE VIEW supporter_first_seen AS
  SELECT s.id AS supporter_id,
    (SELECT min(i.seen_at) FROM supporter_identity i WHERE i.supporter_id = s.id) AS first_seen_at
  FROM supporters s;

ALTER TABLE supporters ADD COLUMN first_seen_at timestamptz;
UPDATE supporters s SET first_seen_at = f.first_seen_at FROM supporter_first_seen f WHERE f.supporter_id = s.id;
CREATE INDEX supporters_first_seen ON supporters (first_seen_at);

-- As before, with first seen from the supporter's own column.
CREATE OR REPLACE VIEW supporters_summary AS
WITH ident AS (
  SELECT supporter_id,
    (array_agg(name ORDER BY seen_at DESC NULLS LAST, name) FILTER (WHERE name <> ''))[1] AS name,
    array_agg(DISTINCT email ORDER BY email) AS emails,
    array_agg(DISTINCT source ORDER BY source) AS sources
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
  coalesce(act.luma_contact, false) AS luma_contact, s.first_seen_at, act.last_active_at,
  coalesce(act.events, 0) AS events, coalesce(act.letters, 0) AS letters, opted.opted_out,
  mem.supporter_id IS NOT NULL AS member
FROM supporters s
LEFT JOIN ident ON ident.supporter_id = s.id
LEFT JOIN act ON act.supporter_id = s.id
LEFT JOIN contact ON contact.supporter_id = s.id
LEFT JOIN opted ON opted.supporter_id = s.id
LEFT JOIN mem ON mem.supporter_id = s.id;
