-- Each run of the nightly copy of ControlAI's letter's signatories into
-- campaign_statuses (lib/server/controlai-import.ts, plans/sobel-bill-support.md),
-- shown at /staff/import: what it matched, added and removed, the names it
-- couldn't place, or why it failed.
CREATE TABLE controlai_imports (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  result jsonb NOT NULL
);
