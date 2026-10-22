-- The list's one row per supporter, built from each source in one grouped
-- pass (every name and email, all activity, all contact details, the
-- opt-outs on their addresses) joined to the supporters, rather than a
-- lookup per column for each supporter. The same columns, with the same
-- values: the newest name given, every email, the newest phone and
-- postcode, the sources, first sign-up and last activity, events
-- registered for, letters, and the lists any of their addresses is opted
-- out of (NULL when none). Where two are as new as each other, the first
-- by its own value wins, so the list is the same each time it's read.
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
)
SELECT s.id, ident.name, ident.emails, contact.phone, contact.postcode, ident.sources,
  coalesce(act.luma_contact, false) AS luma_contact, ident.first_seen_at, act.last_active_at,
  coalesce(act.events, 0) AS events, coalesce(act.letters, 0) AS letters, opted.opted_out
FROM supporters s
LEFT JOIN ident ON ident.supporter_id = s.id
LEFT JOIN act ON act.supporter_id = s.id
LEFT JOIN contact ON contact.supporter_id = s.id
LEFT JOIN opted ON opted.supporter_id = s.id;
