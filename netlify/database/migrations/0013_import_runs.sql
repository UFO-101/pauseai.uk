-- One log of every run of every import and check (lib/server/import-runs.ts),
-- in place of a table each (mp_syncs, mp_checks, controlai_imports): when
-- it ran, who started it, how it ended, why it failed, and what it found.
-- Shown at /staff/import-data and /staff/check-data. Failures are kept too,
-- so the pages can say what went wrong, as can a run that changed nothing,
-- so they can say when it last ran.
CREATE TABLE import_runs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  job text NOT NULL CHECK (job IN ('sync-mps', 'check-mps', 'import-controlai', 'import-signatories')),
  -- 'nightly' for the scheduled functions (netlify/functions/), or the staff
  -- member's email. Null for the runs copied from the old tables, which
  -- didn't record it.
  started_by text,
  -- ok or failed; a sync-mps run is instead unchanged, held, applied or discarded.
  status text NOT NULL CHECK (status IN ('ok', 'failed', 'unchanged', 'held', 'applied', 'discarded')),
  -- Why it failed.
  error text,
  -- The job's own account of the run (its Result type in lib/server/):
  -- { changes, mps? } for sync-mps, { problems } for check-mps, and so on.
  -- {} when it failed.
  result jsonb NOT NULL DEFAULT '{}',
  -- Who applied or discarded a held sync-mps run, and when.
  decided_by text,
  decided_at timestamptz,
  CHECK ((status = 'failed') = (error IS NOT NULL))
);
CREATE INDEX import_runs_job_at ON import_runs (job, at DESC, id DESC);

-- The old tables' rows, so nothing already recorded is lost. A held sync's
-- full MP list is still needed to apply it; the others' aren't kept.
INSERT INTO import_runs (at, job, status, result, decided_by, decided_at)
  SELECT at, 'sync-mps', status,
    CASE WHEN status = 'held' THEN jsonb_build_object('changes', changes, 'mps', mps) ELSE jsonb_build_object('changes', changes) END,
    decided_by, decided_at
  FROM mp_syncs ORDER BY at, id;
INSERT INTO import_runs (at, job, status, result)
  SELECT at, 'check-mps', 'ok', jsonb_build_object('problems', problems) FROM mp_checks ORDER BY at, id;
INSERT INTO import_runs (at, job, status, error, result)
  SELECT at, 'import-controlai',
    CASE WHEN result->>'ok' = 'true' THEN 'ok' ELSE 'failed' END,
    CASE WHEN result->>'ok' = 'true' THEN NULL ELSE result->>'error' END,
    CASE WHEN result->>'ok' = 'true' THEN result - 'ok' ELSE '{}'::jsonb END
  FROM controlai_imports ORDER BY at, id;

DROP TABLE mp_syncs;
DROP TABLE mp_checks;
DROP TABLE controlai_imports;
