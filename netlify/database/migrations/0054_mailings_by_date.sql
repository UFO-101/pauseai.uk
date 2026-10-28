-- A mailing Airtable's Emails table has no tick box for is found by when an
-- email was sent instead (airtable_sent_between): an email with no box of a
-- known mailing ticked, sent then, is that mailing's. A mailing is one or
-- the other, a box or dates.
ALTER TABLE mailings ALTER COLUMN airtable_field DROP NOT NULL;
ALTER TABLE mailings ADD COLUMN airtable_sent_between tstzrange;
ALTER TABLE mailings ADD CONSTRAINT mailings_box_or_dates
  CHECK ((airtable_field IS NULL) <> (airtable_sent_between IS NULL));

-- The DeepMind letter to Sir Demis Hassabis, June to August 2025. Its
-- emails tick only Personalized or AI Generated, how each was written, or
-- nothing.
INSERT INTO mailings (title, ask, airtable_sent_between)
VALUES ('DeepMind letter', 'deepmind-letter', '[2025-06-01T00:00:00Z,2025-09-01T00:00:00Z)');
