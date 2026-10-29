-- A connected Gmail's name, as its own "From:" shows it, so a mailing's
-- preview can show it before it's sent. Empty when the account has none of
-- its own, and Gmail uses the Google account's.
ALTER TABLE staff_accounts ADD COLUMN gmail_name text;
