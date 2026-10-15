-- A login link only works in the browser that asked for it
-- (lib/server/staff-login.ts). This is the SHA-256 of the token in that
-- browser's staff_login cookie. Links made before it have none, so they no
-- longer work: they last 15 minutes anyway.
ALTER TABLE staff_login_links ADD COLUMN browser_hash text;
