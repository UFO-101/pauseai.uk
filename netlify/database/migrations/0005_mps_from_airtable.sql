-- MPs are copied from Airtable, not Parliament's API (plans/email-your-mp-v2.md),
-- so they're keyed by Airtable's record ID. Nothing in production used
-- Parliament's IDs yet, so this replaces them in one step.

ALTER TABLE politicians ADD COLUMN airtable_id text UNIQUE;

-- MPs copied from Parliament would sit beside their copies from Airtable, so
-- they're marked as no longer sitting. A held sync from Parliament can't be
-- applied any more.
UPDATE politicians SET sitting = false, updated_at = now() WHERE parliament_id IS NOT NULL;
UPDATE mp_syncs SET status = 'discarded', decided_by = 'migration', decided_at = now() WHERE status = 'held';
ALTER TABLE politicians DROP COLUMN parliament_id;

-- Where Airtable's MPs disagree with Parliament's Members API, found by the
-- nightly check (lib/server/mp-check.ts) and shown at /staff/mp-check.
CREATE TABLE mp_checks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  problems jsonb NOT NULL
);
