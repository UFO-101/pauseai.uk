-- What went wrong during a run without stopping it, as the job reported it
-- (lib/server/problems.ts): a list of { what, error? }.
ALTER TABLE import_runs ADD COLUMN problems jsonb NOT NULL DEFAULT '[]'::jsonb;
