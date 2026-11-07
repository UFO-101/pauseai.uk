-- What the Luma import needs to tag an upcoming event: how it's held, and
-- its region, as Luma says; and when we last settled its tags, so one
-- applied or asked about isn't touched again.
ALTER TABLE luma_events
  ADD COLUMN IF NOT EXISTS location_type text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS tags_checked_at timestamptz;
