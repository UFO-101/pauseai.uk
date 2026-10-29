-- Supporters who gave the same UK mobile number are one person, whatever
-- their emails. Two supporters with a number in common are merged into
-- the older: its links and messages move to it, and the other goes, with
-- a row here so its old ID still finds them. Landlines and numbers abroad
-- aren't matched, as a household or an office shares them.
CREATE TABLE supporter_merges (
  -- The supporter that went. No foreign key: its row is gone.
  from_id bigint PRIMARY KEY,
  into_id bigint NOT NULL REFERENCES supporters (id) ON DELETE CASCADE,
  merged_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX supporter_merges_into ON supporter_merges (into_id);

-- Merges every two supporters with a UK mobile number in common, until no
-- two share one, each into the older; returns the IDs merged into. With
-- `only_for`, only by the numbers those supporters gave; without, by
-- everyone's. Newest first, so a chain (C shares a number with B, B
-- another with A) ends in A in one pass. Of a message to both in one
-- mailing, the older's row is theirs, and the other's keeps only that it
-- was sent, as an erased supporter's does, so the mailing's counts stay
-- true. The numbers are read from the records' own tables, which
-- supporter_contact unions, where an index on phone_number() finds a
-- number; the query is built for each run, so it's planned for its
-- numbers.
CREATE FUNCTION merge_supporters_by_phone(only_for bigint[] DEFAULT NULL) RETURNS SETOF bigint
LANGUAGE plpgsql ROWS 10 AS $$
DECLARE
  numbers text[];
  pairs text;
  pair record;
  merged boolean;
BEGIN
  IF only_for IS NOT NULL THEN
    numbers := (SELECT array_agg(DISTINCT phone_number(c.phone)) FROM supporter_contact c
                WHERE c.supporter_id = ANY(only_for) AND phone_number(c.phone) LIKE '+447%');
    IF numbers IS NULL THEN
      RETURN;
    END IF;
  END IF;
  pairs := format(
    $sql$WITH numbers AS (
      SELECT k.supporter_id, phone_number(g.phone) AS phone FROM luma_guests g
        JOIN supporter_links k ON k.luma_user_id = g.user_id WHERE phone_number(g.phone) %1$s
      UNION SELECT k.supporter_id, phone_number(f.phone) FROM form_entries f
        JOIN supporter_links k ON k.form_entry_id = f.id WHERE phone_number(f.phone) %1$s
      UNION SELECT k.supporter_id, phone_number(m.phone) FROM members m
        JOIN supporter_links k ON k.member_id = m.id WHERE phone_number(m.phone) %1$s)
    SELECT a.supporter_id AS from_id, min(b.supporter_id) AS into_id
    FROM numbers a JOIN numbers b ON b.phone = a.phone AND b.supporter_id < a.supporter_id
    GROUP BY a.supporter_id ORDER BY a.supporter_id DESC$sql$,
    CASE WHEN numbers IS NULL THEN $sql$LIKE '+447%'$sql$ ELSE '= ANY($1)' END
  );
  LOOP
    merged := false;
    FOR pair IN EXECUTE pairs USING numbers LOOP
      UPDATE supporter_links SET supporter_id = pair.into_id WHERE supporter_id = pair.from_id;
      UPDATE messages_to_supporters m SET supporter_id = NULL, address = NULL, merge_values = NULL
      WHERE m.supporter_id = pair.from_id
        AND EXISTS (SELECT 1 FROM messages_to_supporters o WHERE o.supporter_id = pair.into_id AND o.mailing_id = m.mailing_id);
      UPDATE messages_to_supporters SET supporter_id = pair.into_id WHERE supporter_id = pair.from_id;
      UPDATE supporter_merges SET into_id = pair.into_id WHERE into_id = pair.from_id;
      INSERT INTO supporter_merges (from_id, into_id) VALUES (pair.from_id, pair.into_id);
      DELETE FROM supporters WHERE id = pair.from_id;
      merged := true;
      RETURN NEXT pair.into_id;
    END LOOP;
    EXIT WHEN NOT merged;
  END LOOP;
END
$$;

-- Those who share a number now, with when each was first seen and the
-- list worked out again.
CREATE TEMP TABLE merged_into AS SELECT DISTINCT id FROM merge_supporters_by_phone() id;
UPDATE supporters s SET first_seen_at = f.first_seen_at FROM supporter_first_seen f
WHERE f.supporter_id = s.id AND s.id IN (SELECT id FROM merged_into);
DROP TABLE merged_into;
REFRESH MATERIALIZED VIEW supporters_list;
