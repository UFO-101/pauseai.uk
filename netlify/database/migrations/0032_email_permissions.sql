-- Whether we may email each address about each topic, and why: the one
-- place the rules are written down, email_permission(). Everything that
-- asks reads it through the views below: the supporter pages, the list's
-- filter and the staff home's count of unsubscribes.
--
-- An opt-out is only ever a real unsubscribe. Leaving "Keep me informed"
-- unticked is read from the member record itself, so the import's rows for
-- it go.
DELETE FROM opt_outs WHERE source = 'airtable-import';
ALTER TABLE opt_outs DROP CONSTRAINT opt_outs_source_check;
ALTER TABLE opt_outs ADD CONSTRAINT opt_outs_source_check CHECK (source IN ('luma-webhook'));

-- So a few addresses' letters are found without reading every letter.
CREATE INDEX letters_sender_address ON letters (lower(trim(sender_email)));

-- Whether we may email an address about a topic, and why. `send` is yes,
-- no, or unsure: a yes we can't be sure still holds, as an unsubscribe may
-- not have reached us. `reason` says why:
--
-- - blocked: an email to it bounced hard or was marked as spam, so nothing
--   goes to it, whatever the topic;
-- - unsubscribed: it told us no, through the source's own unsubscribe;
-- - declined: it left the box unticked: "Keep me informed" on joining, or
--   the consent box on a letter;
-- - asked: it ticked the box freely: "Keep me informed" on joining, or the
--   consent box on a letter;
-- - joined: it joined PauseAI before 30 June 2026, when "Keep me informed"
--   became a free choice and everyone who joined was on the updates;
-- - following: it follows the Luma calendar;
-- - not-following: it never followed the calendar, though it registered
--   for an event;
-- - removed: it was a member, but isn't shared with us any more.
--
-- `at` is since when, and `source` which source told us. The first rule
-- that matches, in `rank` order, is the answer. A single query, so the
-- planner inlines it into each view that asks.
CREATE FUNCTION email_permission(for_topic text, for_address text)
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
  -- Following the calendar: unsure from before 22 Oct 2026, when Luma's
  -- webhook started telling us of unsubscribes.
  SELECT 3, CASE WHEN f.since < '2026-10-22T00:00:00Z' THEN 'unsure' ELSE 'yes' END, 'following', f.since, 'luma'
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
  FROM (SELECT * FROM letters l WHERE lower(trim(l.sender_email)) = for_address
        ORDER BY l.created_at DESC, l.id DESC LIMIT 1) l
  WHERE for_topic = 'events-and-ways-to-help'
) r (rank, send, reason, at, source)
ORDER BY r.rank LIMIT 1
$$;

-- The answer for each address and topic it has had anything to do with: a
-- Luma account, a member record, a letter, or an opt-out from the topic. A
-- topic it never had anything to do with has no row: we'd never email it
-- about that.
CREATE VIEW email_permissions AS
SELECT t.topic, t.address, d.send, d.reason, d.at, d.source
FROM (
  SELECT 'luma-calendar' AS topic, email AS address FROM luma_people
  UNION SELECT 'pauseai-updates', email FROM members
  UNION SELECT 'events-and-ways-to-help', lower(trim(sender_email)) FROM letters
  UNION SELECT list, address FROM opt_outs WHERE resubscribed_at IS NULL
) t
CROSS JOIN LATERAL email_permission(t.topic, t.address) d;

-- The rows of email_permissions that are unsubscribes, found from the open
-- opt-outs, so counting them doesn't work out everyone's answer.
CREATE VIEW email_unsubscribes AS
SELECT o.list AS topic, o.address, d.send, d.reason, d.at, d.source
FROM opt_outs o CROSS JOIN LATERAL email_permission(o.list, o.address) d
WHERE o.resubscribed_at IS NULL AND d.reason = 'unsubscribed';

-- As before, without the lists opted out of: email_permissions says that.
DROP VIEW supporters_summary;
CREATE VIEW supporters_summary AS
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
), mem AS (
  SELECT DISTINCT k.supporter_id
  FROM supporter_links k JOIN members m ON m.id = k.member_id WHERE m.removed_at IS NULL
)
SELECT s.id, ident.name, ident.emails, contact.phone, contact.postcode, ident.sources,
  coalesce(act.luma_contact, false) AS luma_contact, s.first_seen_at, act.last_active_at,
  coalesce(act.events, 0) AS events, coalesce(act.letters, 0) AS letters,
  mem.supporter_id IS NOT NULL AS member
FROM supporters s
LEFT JOIN ident ON ident.supporter_id = s.id
LEFT JOIN act ON act.supporter_id = s.id
LEFT JOIN contact ON contact.supporter_id = s.id
LEFT JOIN mem ON mem.supporter_id = s.id;
