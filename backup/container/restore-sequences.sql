-- Run after restoring a dump: sets each identity column's sequence to follow
-- the highest value in its column. Dumps leave out sequences' values, which
-- Netlify's read-only user can't read, so a restored sequence would start
-- at 1 and the next new row would clash with an existing one.
DO $$
DECLARE
  col record;
BEGIN
  FOR col IN
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND is_identity = 'YES'
  LOOP
    EXECUTE format(
      'SELECT setval(pg_get_serial_sequence(%L, %L), coalesce(max(%I), 0) + 1, false) FROM %I.%I',
      format('%I.%I', col.table_schema, col.table_name),
      col.column_name,
      col.column_name,
      col.table_schema,
      col.table_name
    );
  END LOOP;
END
$$;
