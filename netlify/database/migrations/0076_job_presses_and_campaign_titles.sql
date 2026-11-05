-- A job's button pressed and not finished, so a second press doesn't start
-- another. A press that dies is ignored once it's older than any can run.
CREATE TABLE job_presses (
  job text PRIMARY KEY,
  started_by text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now()
);

-- The campaigns of pauseai.info's old form, named for what they ask.
UPDATE campaigns SET title = 'Call DeepMind to honour AI Safety Summit pledges' WHERE slug = 'pauseai-info-deepmind';
UPDATE campaigns SET title = 'Legislate for liability for AI model severe harm' WHERE slug = 'pauseai-info-liability';
UPDATE campaigns SET title = 'Regulate AI developers now (Airtable)' WHERE slug = 'pauseai-info-frontier-ai';
