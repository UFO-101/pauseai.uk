-- A member's number with no intent is a volunteer's only from before 30
-- June 2026, when the join form was a Tally form that didn't ask one. A
-- record since with no intent didn't choose to volunteer, so its number is
-- unsure, as another intent's is. The rest of contact_permission() is as
-- in 0049, which explains it.
CREATE OR REPLACE FUNCTION contact_permission(for_topic text, for_channel text, for_address text)
RETURNS TABLE (send text, reason text, at timestamptz, source text)
LANGUAGE sql STABLE AS $$
SELECT r.send, r.reason, r.at, r.source FROM (
  -- A blocked address overrides everything.
  SELECT 1, 'no', 'blocked', p.at, p.kind
  FROM email_blocks b JOIN email_problems p ON p.id = b.problem_id
  WHERE for_channel = 'email' AND b.address = for_address
  UNION ALL
  -- Then an opt-out in force.
  SELECT 2, 'no', 'unsubscribed', o.unsubscribed_at, o.source
  FROM opt_outs o
  WHERE o.channel = for_channel AND o.address = for_address AND o.list = for_topic AND o.resubscribed_at IS NULL
  UNION ALL
  -- A contact of the calendar.
  SELECT 3, 'yes', 'following', f.since, 'luma'
  FROM (SELECT min(l.contact_since) AS since FROM luma_people l WHERE l.email = for_address) f
  WHERE for_channel = 'email' AND for_topic = 'luma-calendar' AND f.since IS NOT NULL
  UNION ALL
  SELECT 4, 'no', 'not-following', NULL, NULL WHERE for_channel = 'email' AND for_topic = 'luma-calendar'
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
  WHERE for_channel = 'email' AND for_topic = 'pauseai-updates'
  UNION ALL
  -- The box on the newest form entry.
  SELECT 3, CASE WHEN f.contact_consent THEN 'yes' ELSE 'no' END,
    CASE WHEN f.contact_consent THEN 'asked' ELSE 'declined' END, f.created_at, f.form
  FROM (SELECT * FROM form_entries f WHERE for_channel = 'email' AND lower(trim(f.email)) = for_address
        UNION ALL
        SELECT * FROM form_entries f WHERE for_channel = 'phone' AND phone_number(f.phone) = for_address
        ORDER BY created_at DESC, id DESC LIMIT 1) f
  WHERE for_topic = 'site-forms'
  UNION ALL
  -- The answer of the Luma account that gave the number.
  SELECT 3, a.send, a.reason, a.at, 'luma'
  FROM (SELECT
          CASE WHEN o.id IS NULL AND l.contact_since IS NOT NULL THEN 'yes' ELSE 'no' END AS send,
          CASE WHEN o.id IS NOT NULL THEN 'unsubscribed'
            WHEN l.contact_since IS NOT NULL THEN 'following' ELSE 'not-following' END AS reason,
          coalesce(o.unsubscribed_at, l.contact_since) AS at
        FROM luma_people l
          LEFT JOIN opt_outs o ON o.channel = 'email' AND o.list = 'luma-calendar' AND o.address = l.email
            AND o.resubscribed_at IS NULL
        WHERE l.user_id IN (SELECT g.user_id FROM luma_guests g WHERE phone_number(g.phone) = for_address)
        ORDER BY o.id IS NULL AND l.contact_since IS NOT NULL DESC, coalesce(o.unsubscribed_at, l.contact_since) DESC NULLS LAST
        LIMIT 1) a
  WHERE for_channel = 'phone' AND for_topic = 'luma-calendar'
  UNION ALL
  -- The newest member record that gave the number, one still shared first.
  -- No intent before 30 June 2026 is the Tally form, which didn't ask one,
  -- taken as a volunteer's; no intent since is unsure.
  SELECT 3,
    CASE WHEN m.removed_at IS NOT NULL THEN 'no'
      WHEN m.intent = 'Volunteer' OR (m.intent IS NULL AND m.created_at < '2026-06-30T00:00:00Z') THEN 'yes'
      ELSE 'unsure' END,
    CASE WHEN m.removed_at IS NOT NULL THEN 'removed'
      WHEN m.intent = 'Volunteer' OR (m.intent IS NULL AND m.created_at < '2026-06-30T00:00:00Z') THEN 'volunteered'
      ELSE 'gave-number' END,
    m.created_at, 'member'
  FROM (SELECT * FROM members m WHERE phone_number(m.phone) = for_address
        ORDER BY m.removed_at IS NOT NULL, m.created_at DESC, m.id LIMIT 1) m
  WHERE for_channel = 'phone' AND for_topic = 'volunteering'
  UNION ALL
  -- The newest entry on a form with texts on the day, until the day ends.
  SELECT 3, CASE WHEN now() < f.ends_at THEN 'yes' ELSE 'no' END,
    CASE WHEN now() < f.ends_at THEN 'gave-number' ELSE 'ended' END, f.created_at, f.form
  FROM (SELECT f.*, d.ends_at FROM form_entries f JOIN day_texts d ON d.form = f.form
        WHERE phone_number(f.phone) = for_address ORDER BY f.created_at DESC, f.id DESC LIMIT 1) f
  WHERE for_channel = 'phone' AND for_topic = 'march-day'
) r (rank, send, reason, at, source)
ORDER BY r.rank LIMIT 1
$$;
