-- The hourly sending and the nightly tidying are runs of the import log too,
-- so their failures and problems are kept and emailed about like any job's.
ALTER TABLE import_runs DROP CONSTRAINT import_runs_job_check;
ALTER TABLE import_runs ADD CONSTRAINT import_runs_job_check
  CHECK (job = ANY (ARRAY['sync-politicians', 'check-mps', 'import-controlai', 'import-signatories', 'import-luma', 'import-members',
    'sync-emails', 'import-web-form-letters', 'import-go-to-parliament', 'read-gmail', 'import-old-letters', 'send-mailings', 'tidy-logs']));
