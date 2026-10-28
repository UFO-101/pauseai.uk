import { rmSync } from "node:fs";
import { addTestMps, databaseNames, dropDatabase, freshDatabase, runSql } from "@/scripts/fresh-database.mjs";
import { FLOW_DATABASES, OUTBOX_DIR, TEMPLATE_DATABASE } from "../checkout.mjs";
import { FIXTURE_NOW, TEST_MP_EMAIL } from "../fixture-env.mjs";

// Before the flows: the template database each flow's is copied from
// (fixtures.ts), migrated and with the test MPs, as the build's own database
// is made. Flows that need the fixture politicians sync them in themselves
// (syncPoliticians in tests/steps.ts).
//
// The server's clock is fixed at FIXTURE_NOW (lib/now.ts); so is the
// database's: a now() in a `fixture` schema, which each flow's database puts
// first on its search path, and which the columns that default to now() use.
// So a letter's sent time and an audit entry's time are the same on every
// run, and the storyboard compares those pages unmasked.
export default function globalSetup(): void {
  // Left over from this checkout's run that was stopped: nothing can be using them now.
  for (const name of databaseNames(FLOW_DATABASES)) dropDatabase(name);

  const url = freshDatabase(TEMPLATE_DATABASE);
  addTestMps(url, TEST_MP_EMAIL);
  runSql(
    TEMPLATE_DATABASE,
    `CREATE SCHEMA fixture;
     CREATE FUNCTION fixture.now() RETURNS timestamptz LANGUAGE sql IMMUTABLE
       AS $$ SELECT '${FIXTURE_NOW}'::timestamptz $$;
     DO $$
     DECLARE col record;
     BEGIN
       FOR col IN SELECT table_name, column_name FROM information_schema.columns
                  WHERE table_schema = 'public' AND column_default = 'now()'
       LOOP
         EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT fixture.now()', col.table_name, col.column_name);
       END LOOP;
     END $$;
     -- The rows the migrations wrote got the real clock's time.
     UPDATE staff_accounts SET added_at = fixture.now() WHERE added_by = 'migration';`,
  );

  // The outbox fills up over runs, and every email in it is read each time a flow looks.
  rmSync(OUTBOX_DIR, { recursive: true, force: true });
}
