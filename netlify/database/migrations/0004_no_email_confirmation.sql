-- Letters are sent as soon as the form is accepted, with no email
-- confirmation, and each sender email gets one letter per campaign
-- (plans/email-your-mp-v2.md, "Changes agreed with Joseph"). Nothing in
-- production confirmed letters yet, so this removes them in one step.

DELETE FROM letters WHERE status = 'unconfirmed';
DROP INDEX letters_unconfirmed_created_at;
DROP INDEX letters_sender_email_created_at;
ALTER TABLE letters DROP COLUMN token_hash;
ALTER TABLE letters DROP CONSTRAINT letters_status_check;
ALTER TABLE letters ADD CONSTRAINT letters_status_check CHECK (status IN ('sending', 'sent', 'bounced', 'spam_complaint'));

-- The one letter per campaign check counts these.
CREATE INDEX letters_sender_email_campaign ON letters (lower(sender_email), campaign);
