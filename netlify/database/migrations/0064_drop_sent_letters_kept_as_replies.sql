-- A letter's own copy in the Sent of the Gmail it went from, kept as a
-- message in its thread: Gmail had sent it with a Message-ID of its own,
-- which the reading didn't know as ours. Its blob is left; nothing names it.
DELETE FROM letter_replies r
  USING email_sends s
  WHERE s.backend = 'gmail' AND s.sender = r.account AND s.message_id = r.gmail_message_id;
