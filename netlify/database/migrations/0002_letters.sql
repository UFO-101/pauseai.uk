-- Email your MP: letters, sent through Postmark once the sender confirms
-- their email (stage 4 of plans/email-your-mp-v2.md).

CREATE TABLE letters (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  campaign text NOT NULL,
  politician_id bigint NOT NULL REFERENCES politicians (id),
  sender_name text NOT NULL,
  sender_email text NOT NULL,
  -- As typed, one line each, and the postcode the MP was found from.
  sender_address text NOT NULL,
  sender_postcode text NOT NULL,
  contact_consent boolean NOT NULL,
  subject text NOT NULL,
  -- The letter as sent, signature and all.
  body text NOT NULL,
  -- The part after reply+ in the letter's own address, which says which
  -- letter a reply belongs to.
  reply_hash text NOT NULL UNIQUE,
  -- SHA-256 of the single-use confirmation token. Cleared once used.
  token_hash text UNIQUE,
  status text NOT NULL CHECK (status IN ('unconfirmed', 'sending', 'sent', 'bounced', 'spam_complaint')),
  postmark_message_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

-- The cap on confirmation emails counts these by address over a day.
CREATE INDEX letters_sender_email_created_at ON letters (lower(sender_email), created_at);
-- Unconfirmed letters are deleted after 7 days.
CREATE INDEX letters_unconfirmed_created_at ON letters (created_at) WHERE status = 'unconfirmed';

-- Each change of a letter's status, with what caused it.
CREATE TABLE letter_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  letter_id bigint NOT NULL REFERENCES letters (id) ON DELETE CASCADE,
  at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX letter_events_letter_id ON letter_events (letter_id, at);
