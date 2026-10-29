-- A staff member's Gmail, once they connect it: the refresh token Google
-- gave the site, encrypted (lib/server/gmail-tokens.ts), and the last
-- historyId read from the mailbox, from which the next read lists what's
-- new. Disconnecting deletes both.
ALTER TABLE staff_accounts
  ADD COLUMN gmail_token bytea,
  ADD COLUMN gmail_connected_at timestamptz,
  ADD COLUMN gmail_history_id text,
  ADD CONSTRAINT staff_accounts_gmail_check
    CHECK ((gmail_token IS NULL) = (gmail_connected_at IS NULL) AND (gmail_token IS NOT NULL OR gmail_history_id IS NULL));

-- Each send says which backend sent it, Postmark or a staff member's Gmail,
-- and which account a mailing went from; and for a mailing's letters, the
-- Message-ID it went with, which replies name in In-Reply-To and
-- References, and Gmail's thread.
ALTER TABLE email_sends
  ADD COLUMN backend text NOT NULL DEFAULT 'postmark' CHECK (backend IN ('postmark', 'gmail')),
  ADD COLUMN sender text CHECK (sender = lower(sender)),
  ADD COLUMN rfc_message_id text,
  ADD COLUMN gmail_thread_id text,
  ADD CONSTRAINT email_sends_gmail_sender CHECK (backend = 'postmark' OR sender IS NOT NULL);
ALTER TABLE email_sends DROP CONSTRAINT email_sends_purpose_check;
ALTER TABLE email_sends ADD CONSTRAINT email_sends_purpose_check
  CHECK (purpose IN ('letter', 'forwarded-reply', 'staff-login', 'staff-alert', 'mailing', 'mailing-test'));
CREATE INDEX email_sends_rfc_message_id ON email_sends (rfc_message_id) WHERE rfc_message_id IS NOT NULL;
-- Today's sends from each account, for its daily limit.
CREATE INDEX email_sends_sender ON email_sends (sender, at) WHERE sender IS NOT NULL;

-- A bounce read from a Gmail mailbox, rather than reported by Postmark: the
-- message it came in, so reading it again finds it's done.
ALTER TABLE email_problems ADD COLUMN gmail_message_id text;
CREATE UNIQUE INDEX email_problems_gmail ON email_problems (gmail_message_id, address) WHERE gmail_message_id IS NOT NULL;

-- A later email in the thread of one of PauseAI's letters: the
-- politician's reply, or our answer. The whole message is kept, gzipped,
-- in Netlify Blobs under `blob_key`; this row says whose, when and what.
-- Politicians write in their public role, so their replies are kept in
-- full.
CREATE TABLE letter_replies (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  letter_id bigint NOT NULL REFERENCES letters (id) ON DELETE CASCADE,
  -- The mailbox it was read from, and its ID and thread there.
  account text NOT NULL CHECK (account = lower(account)),
  gmail_message_id text NOT NULL,
  gmail_thread_id text NOT NULL,
  rfc_message_id text,
  from_address text NOT NULL CHECK (from_address = lower(from_address)),
  from_name text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  at timestamptz NOT NULL,
  -- Sent from the mailbox it was read from: our answer, not their reply.
  from_us boolean NOT NULL,
  blob_key text NOT NULL UNIQUE,
  size integer NOT NULL CHECK (size >= 0),
  UNIQUE (account, gmail_message_id)
);
CREATE INDEX letter_replies_letter ON letter_replies (letter_id, at);

-- The views that kept the letter tables' old names, for the site deployed
-- before 0056.
DROP VIEW supporter_letters;
DROP VIEW pauseai_letters;

-- The not-null constraints, named for the tables' old names.
ALTER TABLE letters_from_supporters RENAME CONSTRAINT supporter_letters_id_not_null TO letters_from_supporters_id_not_null;
ALTER TABLE letters_from_supporters RENAME CONSTRAINT supporter_letters_kind_not_null TO letters_from_supporters_kind_not_null;
ALTER TABLE letters_from_supporters RENAME CONSTRAINT supporter_letters_campaign_not_null TO letters_from_supporters_campaign_not_null;
ALTER TABLE letters_from_supporters RENAME CONSTRAINT supporter_letters_subject_not_null TO letters_from_supporters_subject_not_null;
ALTER TABLE letters_from_supporters RENAME CONSTRAINT supporter_letters_entry_id_not_null TO letters_from_supporters_entry_id_not_null;
ALTER TABLE letters_from_pauseai RENAME CONSTRAINT pauseai_letters_id_not_null TO letters_from_pauseai_id_not_null;
ALTER TABLE letters_from_pauseai RENAME CONSTRAINT pauseai_letters_kind_not_null TO letters_from_pauseai_kind_not_null;
ALTER TABLE letters_from_pauseai RENAME CONSTRAINT pauseai_letters_mailing_id_not_null TO letters_from_pauseai_mailing_id_not_null;
ALTER TABLE letters_from_pauseai RENAME CONSTRAINT pauseai_letters_personalised_not_null TO letters_from_pauseai_personalised_not_null;
