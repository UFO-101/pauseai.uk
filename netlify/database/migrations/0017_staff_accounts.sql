-- Staff accounts (lib/server/staff-accounts.ts). Logging in stays open to
-- any pauseai.uk address, but only an address with an account sees the
-- staff pages; without one, the home page says whom to ask. Permissions
-- open more: 'supporters' the supporter pages, 'admin' the accounts page.
-- admin@pauseai.uk starts with an account and the admin permission, so
-- there's an admin before anyone has added one.
CREATE TABLE staff_accounts (
  email text PRIMARY KEY CHECK (email = lower(email)),
  permissions text[] NOT NULL DEFAULT '{}' CHECK (permissions <@ ARRAY['admin', 'supporters']),
  -- The admin who added them.
  added_by text NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO staff_accounts (email, permissions, added_by) VALUES ('admin@pauseai.uk', '{admin}', 'migration');
