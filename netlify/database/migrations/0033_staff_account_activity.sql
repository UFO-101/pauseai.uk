-- When each staff account last logged in (createSession) and was last seen
-- (sessionEmail, which renews a session), for the accounts page: sessions
-- are deleted when they end, and a kept one can go months without a login.
-- An account's added_by is the admin who added it, or 'login' for one its
-- first login made.
ALTER TABLE staff_accounts ADD COLUMN last_login_at timestamptz;
ALTER TABLE staff_accounts ADD COLUMN last_seen_at timestamptz;
