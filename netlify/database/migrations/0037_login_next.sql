-- The staff page a login link goes to once used: the page someone was
-- logging in for.
ALTER TABLE staff_login_links ADD COLUMN next text NOT NULL DEFAULT '/staff';
