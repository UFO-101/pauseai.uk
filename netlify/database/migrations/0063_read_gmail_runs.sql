-- Each hourly read of the connected Gmail accounts, in the import log.
ALTER TABLE import_runs DROP CONSTRAINT import_runs_job_check;
ALTER TABLE import_runs ADD CONSTRAINT import_runs_job_check CHECK (job IN (
  'sync-politicians', 'check-mps', 'import-controlai', 'import-signatories', 'import-luma', 'import-members',
  'sync-emails', 'import-web-form-letters', 'import-go-to-parliament', 'read-gmail'
));
