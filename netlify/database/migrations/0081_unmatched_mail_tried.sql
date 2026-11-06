-- When a report of unmatched mail was last tried, whether or not its email
-- went, so that a failing notification inbox is tried only once a day.
ALTER TABLE unmatched_mail ADD COLUMN tried_at timestamptz;
