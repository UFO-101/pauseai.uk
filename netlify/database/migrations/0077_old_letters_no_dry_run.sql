-- Every press of the import of old letters is a real one, so a message has
-- one row, and the log keeps only what was really done.
DELETE FROM old_letters_mail WHERE dry_run;
DELETE FROM import_runs WHERE job = 'import-old-letters' AND result->>'dryRun' = 'true';
ALTER TABLE old_letters_mail DROP COLUMN dry_run;
ALTER TABLE old_letters_mail ADD PRIMARY KEY (account, gmail_message_id);
CREATE INDEX old_letters_mail_waiting ON old_letters_mail (source) WHERE outcome IS NULL;
CREATE INDEX old_letters_mail_rfc ON old_letters_mail (rfc_message_id) WHERE letter_id IS NOT NULL;
CREATE INDEX old_letters_mail_thread ON old_letters_mail (account, gmail_thread_id) WHERE letter_id IS NOT NULL;
