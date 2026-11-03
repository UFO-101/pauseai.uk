-- Supporters' letters to MPs go from the letters inbox, a Gmail account
-- used for nothing else, and each side sees the other only as a proxy: a
-- plus address on that account, <local>+<tag>@<domain>, its tag a row here.
-- A supporter's proxy is keyed by their email address, so it's the same in
-- every letter they send; an MP's by the politician. A tag is named once,
-- from a name, and never changes (lib/server/proxies.ts).
CREATE TABLE proxies (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tag text NOT NULL UNIQUE CHECK (tag ~ '^[a-z0-9]+(\.[a-z0-9]+)*$'),
  supporter_email text UNIQUE CHECK (supporter_email = lower(btrim(supporter_email))),
  notable_person_id bigint UNIQUE REFERENCES notable_people (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(supporter_email, notable_person_id) = 1)
);

-- A letter sent from its own address on letters.pauseai.uk, by Postmark,
-- keeps that address's mailbox; one from the letters inbox, its sender's
-- proxy; one copied from Airtable, neither.
ALTER TABLE letters_from_supporters RENAME COLUMN reply_hash TO postmark_mailbox;
ALTER TABLE letters_from_supporters RENAME CONSTRAINT letters_from_supporters_reply_hash_key
  TO letters_from_supporters_postmark_mailbox_key;
ALTER TABLE letters_from_supporters DROP CONSTRAINT letters_from_supporters_reply_hash_check;
ALTER TABLE letters_from_supporters
  ADD COLUMN proxy_id bigint REFERENCES proxies (id),
  -- The letter as the sender left it, the editor's document, which the
  -- email's text and HTML are made from; and the draft the form began
  -- with, as text, rebuilt when it was sent: approximate if a deploy
  -- changed the campaign's text since the form was opened. own_words is
  -- the share of the letter's words that aren't the draft's.
  ADD COLUMN letter jsonb,
  ADD COLUMN draft text,
  ADD COLUMN draft_approximate boolean,
  ADD COLUMN own_words real CHECK (own_words BETWEEN 0 AND 1),
  -- Where the supporter's copy of the letter is: waiting to go, going,
  -- gone, or held as their address is blocked.
  ADD COLUMN copy_state text CHECK (copy_state IN ('queued', 'sending', 'sent', 'held')),
  ADD CONSTRAINT letters_from_supporters_sent_by CHECK (num_nonnulls(postmark_mailbox, airtable_id, proxy_id) = 1),
  ADD CONSTRAINT letters_from_supporters_letter CHECK ((proxy_id IS NULL) = (letter IS NULL) AND (proxy_id IS NULL) = (copy_state IS NULL)),
  ADD CONSTRAINT letters_from_supporters_draft CHECK (
    (draft IS NULL) = (draft_approximate IS NULL) AND (draft IS NULL) = (own_words IS NULL) AND (draft IS NULL OR proxy_id IS NOT NULL));
CREATE INDEX letters_from_supporters_proxy ON letters_from_supporters (proxy_id);

-- A supporter's letter waits, queued, when it can't go at once: the
-- letters inbox's daily limit, Gmail down, or the MP's address blocked.
ALTER TABLE letters DROP CONSTRAINT letters_status_check;
ALTER TABLE letters ADD CONSTRAINT letters_status_check CHECK (
  status IN ('sending', 'sent', 'not_sent', 'bounced', 'spam_complaint')
  OR (kind = 'pauseai' AND status IN ('scheduled', 'cancelled', 'skipped'))
  OR (kind = 'supporter' AND status = 'queued'));

-- What the letters inbox sends besides the letter: the supporter's copy,
-- each message relayed, and notices to the supporter.
ALTER TABLE email_sends DROP CONSTRAINT email_sends_purpose_check;
ALTER TABLE email_sends ADD CONSTRAINT email_sends_purpose_check CHECK (purpose IN (
  'letter', 'forwarded-reply', 'staff-login', 'staff-alert', 'mailing', 'mailing-test',
  'letter-copy', 'relay', 'supporter-notice'));

-- A message the supporter sent through their MP's proxy, rather than one
-- from the MP's office.
ALTER TABLE letter_replies ADD COLUMN from_supporter boolean NOT NULL DEFAULT false;

-- Each message kept from the letters inbox is relayed once, to the other
-- side: recorded as sending before it goes and sent after, so a run that
-- stops between the two shows it as uncertain rather than sending it
-- again. Queued to be tried again (Gmail's limits, or a bounce staff have
-- since fixed), held while the address it's to is blocked, or bounced.
CREATE TABLE letter_relays (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  letter_id bigint NOT NULL REFERENCES letters (id) ON DELETE CASCADE,
  reply_id bigint NOT NULL UNIQUE REFERENCES letter_replies (id) ON DELETE CASCADE,
  to_supporter boolean NOT NULL,
  status text NOT NULL CHECK (status IN ('queued', 'sending', 'sent', 'held', 'bounced', 'uncertain')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  rfc_message_id text,
  CHECK ((status = 'sent') = (sent_at IS NOT NULL))
);
CREATE INDEX letter_relays_letter ON letter_relays (letter_id, created_at);
CREATE INDEX letter_relays_waiting ON letter_relays (created_at) WHERE status = 'queued';
