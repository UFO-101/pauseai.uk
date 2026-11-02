-- Notes staff write about a supporter or a politician, each its own row,
-- with who wrote it and when. A supporter's go when they're erased, and
-- move with them when they're merged into another; a politician's go if
-- they're deleted. `created_at` and `edited_at` have no default: the site
-- gives its own clock's time (lib/now.ts), so a fixture build's are fixed.
CREATE TABLE notes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  supporter_id bigint REFERENCES supporters (id) ON DELETE CASCADE,
  notable_person_id bigint REFERENCES notable_people (id) ON DELETE CASCADE,
  body text NOT NULL CHECK (btrim(body) <> ''),
  written_by text NOT NULL,
  created_at timestamptz NOT NULL,
  edited_at timestamptz,
  CHECK ((supporter_id IS NULL) <> (notable_person_id IS NULL))
);
CREATE INDEX notes_supporter ON notes (supporter_id) WHERE supporter_id IS NOT NULL;
CREATE INDEX notes_notable_person ON notes (notable_person_id) WHERE notable_person_id IS NOT NULL;

-- As before, and a supporter's notes move with them.
CREATE OR REPLACE FUNCTION merge_supporters_by_phone(only_for bigint[] DEFAULT NULL) RETURNS SETOF bigint
    LANGUAGE plpgsql ROWS 10
    AS $_$
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
      UPDATE notes SET supporter_id = pair.into_id WHERE supporter_id = pair.from_id;
      UPDATE supporter_merges SET into_id = pair.into_id WHERE into_id = pair.from_id;
      INSERT INTO supporter_merges (from_id, into_id) VALUES (pair.from_id, pair.into_id);
      DELETE FROM supporters WHERE id = pair.from_id;
      merged := true;
      RETURN NEXT pair.into_id;
    END LOOP;
    EXIT WHEN NOT merged;
  END LOOP;
END
$_$;
