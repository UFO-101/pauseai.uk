-- "Keep me signed in" on the login form (lib/server/staff-login.ts): the
-- choice travels with the link, then with the session, which lasts 30 days
-- and is renewed on use instead of a day.
ALTER TABLE staff_login_links ADD COLUMN remember boolean NOT NULL DEFAULT false;
ALTER TABLE staff_sessions ADD COLUMN remember boolean NOT NULL DEFAULT false;
