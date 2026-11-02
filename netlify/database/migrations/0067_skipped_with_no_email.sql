-- A mailing's letter to a politician in office with no address is skipped
-- for that, not as though their address were blocked.
ALTER TABLE letters_from_pauseai DROP CONSTRAINT letters_from_pauseai_skip_reason_check;
ALTER TABLE letters_from_pauseai ADD CONSTRAINT letters_from_pauseai_skip_reason_check
  CHECK (skip_reason IN ('blocked', 'left-office', 'no-email'));
