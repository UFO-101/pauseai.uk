-- Only an address at pauseai.uk can have a staff account: the login only
-- sends links there, and the accounts page refuses anything else
-- (lib/server/staff-accounts.ts). An account at any other address could
-- never be used, so any there is goes first.
DELETE FROM staff_accounts WHERE NOT (email ~ '^[^@[:space:]]+@pauseai\.uk$');
ALTER TABLE staff_accounts ADD CONSTRAINT staff_accounts_email_pauseai CHECK (email ~ '^[^@[:space:]]+@pauseai\.uk$');
