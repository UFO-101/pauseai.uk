-- The supporters list's queries, priced lower. Postgres compiles a query
-- it prices above jit_above_cost (100,000) before running it, which takes
-- far longer than these queries do where it has JIT (CI's Postgres image),
-- so each stays under that, however few rows there are.
--
-- The kept list finds each supporter's newest email in one grouped pass, not
-- a subquery for each supporter; and supporters_added() works out each
-- supporter added since the last refresh by their ID, one at a time, rather
-- than in one query priced as if every supporter were new.

DROP VIEW supporters_listed;
DROP FUNCTION supporters_added();
DROP MATERIALIZED VIEW supporters_list;

-- Every supporter as the list shows them, as of the last refresh: their
-- summary, their newest email, and where they are.
CREATE MATERIALIZED VIEW supporters_list AS
SELECT s.id, s.name, s.emails, newest.email,
  s.phone, s.postcode, s.sources, s.luma_follows, s.first_seen_at, s.last_active_at, s.events, s.letters, s.member,
  sp.place, sp.basis, sp.given, sp.country, sp.latitude, sp.longitude
FROM supporters_summary s
  LEFT JOIN supporter_place sp ON sp.supporter_id = s.id
  LEFT JOIN (
    SELECT DISTINCT ON (i.supporter_id) i.supporter_id, i.email FROM supporter_identity i
    ORDER BY i.supporter_id, i.seen_at DESC NULLS LAST, i.email
  ) newest ON newest.supporter_id = s.id;

-- Unique, so it can be refreshed while pages go on reading it.
CREATE UNIQUE INDEX supporters_list_id ON supporters_list (id);
-- The list's default order, newest activity first.
CREATE INDEX supporters_list_active ON supporters_list (last_active_at DESC NULLS LAST, id DESC);

-- Every supporter added since the last refresh, worked out now. Supporter
-- IDs only grow, so those are the IDs above the highest kept (one added by
-- a transaction that began before a refresh and ended after a later one's
-- waits for the next refresh). Each is worked out on its own, by their ID:
-- one query for them all would work out everyone. A PL/pgSQL function, so
-- Postgres plans the list as if there are few.
CREATE FUNCTION supporters_added() RETURNS SETOF supporters_list LANGUAGE plpgsql STABLE ROWS 10 AS $$
DECLARE
  newest_kept bigint := (SELECT coalesce(max(l.id), 0) FROM supporters_list l);
  added bigint;
BEGIN
  FOR added IN SELECT n.id FROM supporters n WHERE n.id > newest_kept ORDER BY n.id LOOP
    RETURN QUERY
    SELECT s.id, s.name, s.emails,
      (SELECT i.email FROM supporter_identity i WHERE i.supporter_id = s.id
       ORDER BY i.seen_at DESC NULLS LAST, i.email LIMIT 1),
      s.phone, s.postcode, s.sources, s.luma_follows, s.first_seen_at, s.last_active_at, s.events, s.letters, s.member,
      sp.place, sp.basis, sp.given, sp.country, sp.latitude, sp.longitude
    FROM supporters_summary s LEFT JOIN supporter_place sp ON sp.supporter_id = s.id
    WHERE s.id = added;
  END LOOP;
END
$$;

-- What the list reads: the kept rows, and those added since.
CREATE VIEW supporters_listed AS
SELECT * FROM supporters_list
UNION ALL
SELECT * FROM supporters_added();
