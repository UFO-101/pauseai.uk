-- What each staff member may do beyond the ordinary staff pages
-- (lib/server/staff-permissions.ts): 'supporters' to see supporters,
-- 'admin' to grant and revoke these. Logging in stays open to any
-- pauseai.uk address. admin@pauseai.uk has every permission without a row,
-- so there's an admin before the table has one. A member with none has no
-- row.
CREATE TABLE staff_permissions (
  email text PRIMARY KEY CHECK (email = lower(email)),
  permissions text[] NOT NULL CHECK (permissions <@ ARRAY['admin', 'supporters'] AND cardinality(permissions) > 0),
  -- The admin who last changed them.
  granted_by text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now()
);
