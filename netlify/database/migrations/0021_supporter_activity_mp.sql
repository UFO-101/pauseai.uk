-- A letter in a supporter's history names its MP on its own, linked to the
-- MP's page, with the letter's status apart: `detail` is the MP's name for
-- both a letter and its reply, `href` the MP's page, and `status` the
-- letter's status, for a letter only. A view can be replaced in place, as
-- supporters_summary reads supporter_activity, only by keeping its columns
-- and adding new ones at the end, so `status` comes last, NULL for every
-- other kind.
CREATE OR REPLACE VIEW supporter_activity_luma AS
  SELECT p.user_id AS source_id, p.contact_since AS at, 'luma-contact' AS kind, NULL::text AS title, NULL::text AS detail, NULL::text AS href, NULL::text AS status
  FROM luma_people p WHERE p.contact_since IS NOT NULL
  UNION ALL
  SELECT g.user_id, g.registered_at, 'luma-registered', e.name, g.approval_status, 'https://luma.com/' || e.url, NULL
  FROM luma_guests g JOIN luma_events e ON e.id = g.event_id WHERE g.removed_at IS NULL;

CREATE OR REPLACE VIEW supporter_activity_letter AS
  SELECT l.id AS source_id, l.created_at AS at, 'letter' AS kind, l.campaign AS title, p.name AS detail, '/staff/politicians/' || p.id AS href, l.status AS status
  FROM letters l JOIN politicians p ON p.id = l.politician_id
  UNION ALL
  SELECT l.id, l.replied_at, 'letter-replied', l.campaign, p.name, '/staff/politicians/' || p.id, NULL
  FROM letters l JOIN politicians p ON p.id = l.politician_id WHERE l.replied_at IS NOT NULL;

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
  WHERE o.resubscribed_at IS NOT NULL;
