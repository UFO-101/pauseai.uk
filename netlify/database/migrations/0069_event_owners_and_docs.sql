-- Who on staff owns each of our events: someone chose them on the events
-- page, or the hourly Luma import gave the event its owner by the rules
-- (lib/event-owners.ts). One owner an event; none until someone or the
-- rules give it one. A staff account removed takes its events with it, so
-- they show as having no owner. luma_events is the import's alone, so the
-- owner is kept here.
CREATE TABLE event_owners (
  event_id text PRIMARY KEY REFERENCES luma_events (id) ON DELETE CASCADE,
  owner text NOT NULL REFERENCES staff_accounts (email) ON DELETE CASCADE,
  -- A staff email, or "sync" for the import's rules.
  assigned_by text NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX event_owners_owner ON event_owners (owner);

-- A link to each event's Google Doc, which any staff member can set or
-- clear on the events page.
CREATE TABLE event_docs (
  event_id text PRIMARY KEY REFERENCES luma_events (id) ON DELETE CASCADE,
  url text NOT NULL CHECK (url ~ '^https://(docs|drive)\.google\.com/'),
  set_by text NOT NULL,
  set_at timestamptz NOT NULL DEFAULT now()
);
