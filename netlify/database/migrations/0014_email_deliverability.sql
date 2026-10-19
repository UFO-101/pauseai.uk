-- Every email the site sends, every bounce and complaint about one, and the
-- addresses it won't send to (lib/server/email.ts). A bounce is about an
-- address, whichever email found it out, so it's kept by address.

-- Every email the site tried to send: sent, refused because its address is
-- blocked, or failed at the provider.
CREATE TABLE email_sends (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  purpose text NOT NULL CHECK (purpose IN ('letter', 'forwarded-reply', 'staff-login', 'staff-alert')),
  -- The letter it was, or was about.
  letter_id bigint REFERENCES letters (id) ON DELETE SET NULL,
  -- Its To address, lowercased.
  address text NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('sent', 'refused', 'failed')),
  -- The provider's ID for it, when sent: unique there, though not in the
  -- fixture Postmark, which gives the same email the same ID.
  message_id text,
  CHECK ((outcome = 'sent') = (message_id IS NOT NULL))
);
CREATE INDEX email_sends_address ON email_sends (address, at DESC);
CREATE INDEX email_sends_letter ON email_sends (letter_id);
CREATE INDEX email_sends_message_id ON email_sends (message_id);

-- Every bounce and spam complaint the provider told us about, and every
-- refusal for an address it had already suppressed. Never changed: the
-- history of each address.
CREATE TABLE email_problems (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  address text NOT NULL CHECK (address = lower(address)),
  -- The email it was about, if the provider said.
  message_id text,
  kind text NOT NULL CHECK (kind IN ('hard', 'soft', 'complaint')),
  -- The provider's own words.
  reason text NOT NULL DEFAULT '',
  -- Whether the provider will send to the address again if asked. Never after a complaint.
  can_reset boolean NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  CHECK (kind <> 'complaint' OR NOT can_reset)
);
CREATE INDEX email_problems_at ON email_problems (at DESC, id DESC);
CREATE INDEX email_problems_address ON email_problems (address, at DESC);

-- The addresses the site doesn't send to, each by the hard bounce or
-- complaint that blocked it. Staff unblock one by deleting its row; the
-- problem stays.
CREATE TABLE email_blocks (
  address text PRIMARY KEY CHECK (address = lower(address)),
  problem_id bigint NOT NULL REFERENCES email_problems (id)
);

-- The letters already sent, so their bounces find them.
INSERT INTO email_sends (at, purpose, letter_id, address, outcome, message_id)
SELECT coalesce(l.sent_at, l.created_at), 'letter', l.id, lower(coalesce(p.email, '')), 'sent', l.postmark_message_id
FROM letters l JOIN politicians p ON p.id = l.politician_id
WHERE l.postmark_message_id IS NOT NULL;

ALTER TABLE letters DROP COLUMN postmark_message_id;

-- A letter not sent because its MP's address was blocked by then: kept, so
-- staff can see someone tried.
ALTER TABLE letters DROP CONSTRAINT letters_status_check;
ALTER TABLE letters ADD CONSTRAINT letters_status_check
  CHECK (status IN ('sending', 'sent', 'not_sent', 'bounced', 'spam_complaint'));
