-- Staff log in with a link emailed to their pauseai.uk address, not with
-- Google (lib/server/staff-login.ts). Each link works once, for 15 minutes.
CREATE TABLE staff_login_links (
  -- SHA-256 of the link's token.
  token_hash text PRIMARY KEY,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

-- The cap on login emails counts these by address over an hour.
CREATE INDEX staff_login_links_email_created_at ON staff_login_links (lower(email), created_at);
