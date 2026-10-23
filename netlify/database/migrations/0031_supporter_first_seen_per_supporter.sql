-- supporter_first_seen as a subquery per supporter, so refreshing a few
-- supporters (refreshSupporterFacts() in lib/server/supporter-facts.ts, after
-- a letter) reads only their records, not everyone's. The same rows.
CREATE OR REPLACE VIEW supporter_first_seen AS
  SELECT s.id AS supporter_id,
    (SELECT min(i.seen_at) FROM supporter_identity i WHERE i.supporter_id = s.id) AS first_seen_at
  FROM supporters s;
