-- What the Luma import needs to tag an upcoming event: how it's held, and
-- its region, as Luma says; and when we last settled its tags, so one
-- applied or asked about isn't touched again.
ALTER TABLE luma_events
  ADD COLUMN location_type text,
  ADD COLUMN region text,
  ADD COLUMN tags_checked_at timestamptz;
