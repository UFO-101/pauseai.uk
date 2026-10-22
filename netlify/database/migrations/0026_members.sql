-- PauseAI's members in the UK whom we may hold, as the global membership
-- dataset has them (Stichting PauseAI's Airtable base today), keyed by the
-- Airtable record ID, which CiviCRM keeps too. Only the hourly import writes
-- it (lib/server/members-import.ts).
CREATE TABLE members (
  id text PRIMARY KEY,                    -- the Airtable record ID, "rec…"
  email text NOT NULL CHECK (email = lower(email)),
  name text NOT NULL DEFAULT '',
  phone text,
  city text,
  postcode text,                          -- "Zip code", as typed
  joined_at timestamptz NOT NULL,         -- "Joined Datetime": their first join
  created_at timestamptz NOT NULL,        -- "Created Datetime": this record's; the consent rules key on it
  keep_informed boolean NOT NULL,         -- the join form's "Keep me informed", as Airtable has it
  share_permission boolean NOT NULL,      -- "GDPR chapter share permission", as Airtable has it
  source_page text,                       -- the site the join form was on; not recorded before September 2026
  intent text,                            -- what they chose to do on the join form: Keep informed, Act now, Volunteer, Lead or None
  source_modified_at timestamptz NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  changed_at timestamptz NOT NULL DEFAULT now(),
  -- No longer matched the import's filter at the last run; null again if it does.
  removed_at timestamptz
);
CREATE INDEX members_email ON members (email);

-- Members erased at their request, whom the import never brings back.
CREATE TABLE members_erased (
  id text PRIMARY KEY,                    -- the Airtable record ID, as members.id
  erased_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE import_runs DROP CONSTRAINT import_runs_job_check;
ALTER TABLE import_runs ADD CONSTRAINT import_runs_job_check
  CHECK (job IN ('sync-mps', 'check-mps', 'import-controlai', 'import-signatories', 'import-luma', 'import-members'));

-- The members' updates, "Keep me informed" on the join form, as a list; an
-- opt-out from it the import records for a member who left that unticked.
ALTER TABLE opt_outs DROP CONSTRAINT opt_outs_list_check;
ALTER TABLE opt_outs ADD CONSTRAINT opt_outs_list_check CHECK (list IN ('luma-calendar', 'pauseai-updates'));
ALTER TABLE opt_outs DROP CONSTRAINT opt_outs_source_check;
ALTER TABLE opt_outs ADD CONSTRAINT opt_outs_source_check CHECK (source IN ('luma-webhook', 'airtable-import'));
