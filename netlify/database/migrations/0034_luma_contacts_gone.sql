-- Luma's list of the calendar's contacts is the list it emails. Someone who
-- unsubscribes, or whom we remove or block, is taken off it; following
-- again puts them back as they were. The webhook tells us of unsubscribes
-- but not of returns, so each full pass over the contacts also records
-- who has gone and who has come back, as opt-outs (lib/server/opt-outs.ts).
ALTER TABLE opt_outs DROP CONSTRAINT opt_outs_source_check;
ALTER TABLE opt_outs ADD CONSTRAINT opt_outs_source_check CHECK (source IN ('luma-webhook', 'luma-contacts'));

-- When a read of the contacts last listed them; when the full pass going
-- now began. A contact not listed since the pass began has gone.
ALTER TABLE luma_people ADD COLUMN contact_seen_at timestamptz;
ALTER TABLE luma_import_state ADD COLUMN pass_started_at timestamptz;

-- As before, but a contact of the calendar is a yes, whenever they joined:
-- had they unsubscribed, the list would have left them out.
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
  FROM (SELECT * FROM letters l WHERE lower(trim(l.sender_email)) = for_address
        ORDER BY l.created_at DESC, l.id DESC LIMIT 1) l
  WHERE for_topic = 'events-and-ways-to-help'
) r (rank, send, reason, at, source)
ORDER BY r.rank LIMIT 1
$$;

-- As before, but a Luma contact is one now: not while unsubscribed from the
-- calendar's emails, as Luma has them off its list then.
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
  coalesce(act.luma_contact, false) AND NOT EXISTS (
    SELECT 1 FROM opt_outs o
    WHERE o.list = 'luma-calendar' AND o.resubscribed_at IS NULL AND o.address = ANY (ident.emails)
  ) AS luma_contact,
  s.first_seen_at, act.last_active_at,
  coalesce(act.events, 0) AS events, coalesce(act.letters, 0) AS letters,
  mem.supporter_id IS NOT NULL AS member
FROM supporters s
LEFT JOIN ident ON ident.supporter_id = s.id
LEFT JOIN act ON act.supporter_id = s.id
LEFT JOIN contact ON contact.supporter_id = s.id
LEFT JOIN mem ON mem.supporter_id = s.id;
