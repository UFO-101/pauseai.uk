-- When an MP's reply to a letter first reached us (plans/email-your-mp-v2.md).
-- Each reply is also a 'replied' event in letter_events, with who it came
-- from. The reply's text isn't kept.
ALTER TABLE letters ADD COLUMN replied_at timestamptz;
