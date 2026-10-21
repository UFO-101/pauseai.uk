-- Our Luma calendar's public events, their registered guests and the
-- calendar's contacts, as Luma has them, keyed by Luma's IDs. Only the
-- hourly import writes to them (lib/server/luma-import.ts). Raw payloads
-- are never kept, and nor are events' registration answers, except a
-- postcode.

CREATE TABLE luma_events (
  id text PRIMARY KEY,                 -- Luma's evt-… ID
  name text NOT NULL,
  -- The event's slug on luma.com, as the site's LumaEvent has it.
  url text NOT NULL,
  start_at timestamptz NOT NULL,
  -- 'manage' for our own events; 'view' for one another calendar runs and
  -- ours lists, whose guests Luma doesn't show us.
  access text NOT NULL CHECK (access IN ('manage', 'view')),
  city text,
  latitude double precision,
  longitude double precision,
  CHECK ((latitude IS NULL) = (longitude IS NULL)),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  changed_at timestamptz NOT NULL DEFAULT now(),
  -- The last complete pass over its guest list.
  guests_synced_at timestamptz,
  -- Why the last pass failed, if it did.
  guests_error text
);
CREATE INDEX luma_events_start ON luma_events (start_at DESC);

-- One row per Luma user we've seen, as a guest or a calendar contact.
CREATE TABLE luma_people (
  user_id text PRIMARY KEY,            -- Luma's usr-… ID
  email text NOT NULL CHECK (email = lower(email)),
  name text NOT NULL DEFAULT '',
  -- When they joined the calendar, if they're a contact.
  contact_since timestamptz,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX luma_people_email ON luma_people (email);

-- A guest who registered, asked to, was waitlisted or declined. Luma's
-- invited-only rows aren't imported: being emailed about an event isn't
-- doing anything.
CREATE TABLE luma_guests (
  id text PRIMARY KEY,                 -- Luma's gst-… ID
  event_id text NOT NULL REFERENCES luma_events (id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES luma_people (user_id) ON DELETE CASCADE,
  approval_status text NOT NULL CHECK (approval_status IN ('approved', 'pending_approval', 'waitlist', 'declined')),
  registered_at timestamptz NOT NULL,
  phone text,                          -- as given for this event; Luma gives E.164
  postcode text,                       -- their answer to a registration question whose label contains "postcode", as typed
  utm_source text,
  -- Gone from Luma's list at the last complete pass; null again if seen again.
  removed_at timestamptz,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX luma_guests_user ON luma_guests (user_id, registered_at);
CREATE INDEX luma_guests_event ON luma_guests (event_id);

-- Luma users erased at their request, whom the import never brings back.
CREATE TABLE luma_erased (
  user_id text PRIMARY KEY,
  erased_at timestamptz NOT NULL DEFAULT now()
);

-- Where the import's full passes have got to: when the last complete pass
-- over the events, and over the contacts, finished, and the cursor of a
-- contacts pass spread over several runs.
CREATE TABLE luma_import_state (
  list text PRIMARY KEY CHECK (list IN ('events', 'contacts')),
  full_pass_at timestamptz,
  cursor text NOT NULL DEFAULT ''
);

ALTER TABLE import_runs DROP CONSTRAINT import_runs_job_check;
ALTER TABLE import_runs ADD CONSTRAINT import_runs_job_check
  CHECK (job IN ('sync-mps', 'check-mps', 'import-controlai', 'import-signatories', 'import-luma'));
