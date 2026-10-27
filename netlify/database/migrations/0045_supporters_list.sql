-- The supporters list, kept: what supporters_summary and supporter_place
-- work out about every supporter, stored, so a page of the list doesn't
-- work it out for all of them each time. Refreshed by each import that adds
-- or links supporters, and by an erasure (refreshSupportersList(),
-- lib/server/supporter-facts.ts).

-- supporter_activity with Luma's activity as two arms of its own, a table
-- each, not one arm joining a union of them: Postgres can narrow a plain
-- arm to one supporter, but plans a union inside a join for everyone, which
-- made each supporter's row take as long as the whole list's.
CREATE OR REPLACE VIEW supporter_activity AS
SELECT k.supporter_id, 'luma'::text AS source, p.contact_since AS at, 'luma-contact'::text AS kind,
  NULL::text AS title, NULL::text AS detail, NULL::text AS href, NULL::text AS status
FROM luma_people p JOIN supporter_links k ON k.luma_user_id = p.user_id
WHERE p.contact_since IS NOT NULL
UNION ALL
SELECT k.supporter_id, 'luma'::text, g.registered_at, 'luma-registered'::text,
  e.name, g.approval_status, 'https://luma.com/' || e.url, NULL::text
FROM luma_guests g JOIN luma_events e ON e.id = g.event_id JOIN supporter_links k ON k.luma_user_id = g.user_id
WHERE g.removed_at IS NULL
UNION ALL
SELECT k.supporter_id, f.form, a.at, a.kind, a.title, a.detail, a.href, a.status
FROM supporter_activity_form a JOIN supporter_links k ON k.form_entry_id = a.source_id
  JOIN form_entries f ON f.id = a.source_id
UNION ALL
SELECT k.supporter_id, o.source, o.unsubscribed_at, 'opted-out'::text, o.list, o.address, NULL::text, NULL::text
FROM opt_outs o JOIN (SELECT DISTINCT supporter_id, matched_value FROM supporter_links) k ON k.matched_value = o.address
UNION ALL
SELECT k.supporter_id, o.source, o.resubscribed_at, 'resubscribed'::text, o.list, o.address, NULL::text, NULL::text
FROM opt_outs o JOIN (SELECT DISTINCT supporter_id, matched_value FROM supporter_links) k ON k.matched_value = o.address
WHERE o.resubscribed_at IS NOT NULL
UNION ALL
SELECT k.supporter_id, 'member'::text, a.at, a.kind, a.title, a.detail, a.href, a.status
FROM supporter_activity_member a JOIN supporter_links k ON k.member_id = a.source_id;

DROP VIEW supporter_activity_luma;

-- Every supporter as the list shows them, as of the last refresh: their
-- summary, their newest email, and where they are.
CREATE MATERIALIZED VIEW supporters_list AS
SELECT s.id, s.name, s.emails,
  (SELECT i.email FROM supporter_identity i WHERE i.supporter_id = s.id
   ORDER BY i.seen_at DESC NULLS LAST, i.email LIMIT 1) AS email,
  s.phone, s.postcode, s.sources, s.luma_contact, s.first_seen_at, s.last_active_at, s.events, s.letters, s.member,
  sp.place, sp.basis, sp.given, sp.country, sp.latitude, sp.longitude
FROM supporters_summary s LEFT JOIN supporter_place sp ON sp.supporter_id = s.id;

-- Unique, so it can be refreshed while pages go on reading it.
CREATE UNIQUE INDEX supporters_list_id ON supporters_list (id);
-- The list's default order, newest activity first.
CREATE INDEX supporters_list_active ON supporters_list (last_active_at DESC NULLS LAST, id DESC);

-- Every supporter added since the last refresh, worked out now. Supporter
-- IDs only grow, so those are the IDs above the highest kept (one added by
-- a transaction that began before a refresh and ended after a later one's
-- waits for the next refresh). Each is worked out on its own (OFFSET 0
-- stops Postgres joining them all at once, which works out everyone). A
-- PL/pgSQL function, so Postgres plans the list as if there are few: worked
-- into its plan, the views' cost made it plan every filter for everyone.
CREATE FUNCTION supporters_added() RETURNS SETOF supporters_list LANGUAGE plpgsql STABLE ROWS 10 AS $$
BEGIN
  RETURN QUERY
  SELECT x.* FROM supporters n CROSS JOIN LATERAL (
    SELECT s.id, s.name, s.emails,
      (SELECT i.email FROM supporter_identity i WHERE i.supporter_id = s.id
       ORDER BY i.seen_at DESC NULLS LAST, i.email LIMIT 1) AS email,
      s.phone, s.postcode, s.sources, s.luma_contact, s.first_seen_at, s.last_active_at, s.events, s.letters, s.member,
      sp.place, sp.basis, sp.given, sp.country, sp.latitude, sp.longitude
    FROM supporters_summary s LEFT JOIN supporter_place sp ON sp.supporter_id = s.id
    WHERE s.id = n.id OFFSET 0
  ) x
  WHERE n.id > (SELECT coalesce(max(l.id), 0) FROM supporters_list l);
END
$$;

-- What the list reads: the kept rows, and those added since.
CREATE VIEW supporters_listed AS
SELECT * FROM supporters_list
UNION ALL
SELECT * FROM supporters_added();
