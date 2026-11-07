-- Mail that matched nothing may be a forward whose Date is over its From, which
-- now counts as quoting a politician. Queued to be read again, at the import's
-- next press.
UPDATE old_letters_mail SET outcome = NULL WHERE outcome = 'unmatched';
