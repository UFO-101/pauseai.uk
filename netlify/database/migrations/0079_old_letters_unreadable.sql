-- A message Gmail won't give (it answers 400) has an outcome of its own, so
-- it can be told from one that's gone or isn't ours.
ALTER TABLE old_letters_mail DROP CONSTRAINT old_letters_mail_outcome_check;
ALTER TABLE old_letters_mail ADD CONSTRAINT old_letters_mail_outcome_check
  CHECK (outcome = ANY (ARRAY['joined', 'added', 'reply', 'auto_reply', 'one_off', 'unmatched', 'skipped', 'unreadable']));
