-- Email your MP: politicians and their status for each campaign, staff
-- sessions, a log of who changed what, and the nightly copy of MPs from
-- Parliament. See plans/email-your-mp-v2.md.
--
-- Netlify applies migrations before each production publish and to each
-- preview's copy of the database. They must be backward compatible (expand,
-- then contract), and work with or without a transaction around the file.

CREATE TABLE politicians (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Parliament's member ID, for MPs copied from its Members API. Null for
  -- signers added by hand.
  parliament_id integer UNIQUE,
  house text NOT NULL CHECK (house IN ('commons', 'lords', 'scottish-parliament', 'senedd', 'ni-assembly', 'other')),
  name text NOT NULL,
  salutation text NOT NULL DEFAULT '',
  -- A constituency or region, if they have one.
  constituency text,
  party text NOT NULL DEFAULT '',
  email text,
  -- Testy McTestface MP, found by postcode ZZ99ZZ. There is at most one.
  is_test boolean NOT NULL DEFAULT false,
  -- False once the sync no longer finds them in Parliament. Their statuses
  -- are kept.
  sitting boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX politicians_one_test_mp ON politicians (is_test) WHERE is_test;
CREATE INDEX politicians_sitting_constituency ON politicians (constituency) WHERE sitting AND house = 'commons';

-- What each politician has done for each campaign. Campaigns are defined in
-- code (lib/content/email-your-mp.ts), so this holds the campaign's slug.
CREATE TABLE campaign_statuses (
  politician_id bigint NOT NULL REFERENCES politicians (id) ON DELETE CASCADE,
  campaign text NOT NULL,
  status text NOT NULL CHECK (status IN ('signed', 'supports')),
  status_date date,
  note text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL,
  PRIMARY KEY (politician_id, campaign)
);

CREATE INDEX campaign_statuses_campaign ON campaign_statuses (campaign, status);

-- Staff logins. The cookie holds a random token; this holds its SHA-256.
CREATE TABLE staff_sessions (
  token_hash text PRIMARY KEY,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX staff_sessions_expires_at ON staff_sessions (expires_at);

-- Who changed what, from the staff interface or the nightly sync.
CREATE TABLE audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  -- A staff email, or 'sync' for the nightly copy from Parliament.
  actor text NOT NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX audit_log_at ON audit_log (at DESC);

-- Each copy of the MPs from Parliament. One that changes many MPs at once is
-- held, with the list it fetched, until a person applies or discards it.
CREATE TABLE mp_syncs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('applied', 'held', 'discarded')),
  -- { added, removed, changed }, as lists of MPs.
  changes jsonb NOT NULL,
  -- The full list fetched, so a held sync can be applied later.
  mps jsonb NOT NULL,
  decided_by text,
  decided_at timestamptz
);
