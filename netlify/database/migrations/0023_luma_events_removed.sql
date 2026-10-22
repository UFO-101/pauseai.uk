-- An event gone from the calendar's list at the last full pass is marked
-- removed rather than deleted, so its guests, and the history of everyone
-- who registered, stay (lib/server/luma-import.ts). An event made private,
-- or a local group's taken off our calendar, is gone from the list as much
-- as one deleted in Luma. Null again if it's listed again.
ALTER TABLE luma_events ADD COLUMN removed_at timestamptz;
