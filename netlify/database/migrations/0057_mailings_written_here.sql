-- Mailings written and scheduled on the site, as well as those imported
-- from Airtable. A mailing goes to politicians, as PauseAI's letters, or to
-- supporters, as messages, by email, text or WhatsApp. One written here
-- holds the filter that chose its recipients, its subject and its letter (a
-- document whose merge fields each recipient's values fill in), who wrote
-- it, whose name it's from and when it goes. Its recipients are fixed when
-- it's scheduled, one row each, so who got it never depends on running its
-- filter again.
ALTER TABLE mailings
  ADD COLUMN audience text NOT NULL DEFAULT 'politicians' CHECK (audience IN ('politicians', 'supporters')),
  ADD COLUMN channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'text', 'whatsapp')),
  -- For supporters, what they're contacted about, as contact_permission()
  -- takes it: the list's Contact filter that let them be chosen.
  ADD COLUMN topic text CHECK (topic IN ('luma-calendar', 'pauseai-updates', 'site-forms', 'volunteering', 'march-day')),
  ADD COLUMN filter jsonb,
  ADD COLUMN subject text NOT NULL DEFAULT '',
  ADD COLUMN body jsonb,
  ADD COLUMN created_by text,
  -- Whose account it's sent from (for email to politicians, their Gmail),
  -- and the name it's from.
  ADD COLUMN sent_from text,
  ADD COLUMN from_name text,
  ADD COLUMN due_at timestamptz,
  ADD COLUMN state text NOT NULL DEFAULT 'sent'
    CHECK (state IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  -- Bumped by each save, so a second person editing a draft is told rather
  -- than overwritten.
  ADD COLUMN version integer NOT NULL DEFAULT 1,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  -- When a person last opened it. A draft with no subject or letter that
  -- nobody has opened for a day is deleted.
  ADD COLUMN opened_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE mailings ALTER COLUMN audience DROP DEFAULT;
ALTER TABLE mailings ALTER COLUMN channel DROP DEFAULT;
ALTER TABLE mailings ALTER COLUMN state DROP DEFAULT;

-- An imported mailing is found by a tick box or by dates, and has no
-- letter; every other has a letter, a filter and who wrote it.
ALTER TABLE mailings DROP CONSTRAINT mailings_box_or_dates;
ALTER TABLE mailings ADD CONSTRAINT mailings_box_or_dates
  CHECK (airtable_field IS NULL OR airtable_sent_between IS NULL);
ALTER TABLE mailings ADD CONSTRAINT mailings_imported_or_written
  CHECK ((airtable_field IS NOT NULL OR airtable_sent_between IS NOT NULL)
    = (body IS NULL AND filter IS NULL AND created_by IS NULL));
ALTER TABLE mailings ADD CONSTRAINT mailings_imported_sent
  CHECK (body IS NOT NULL OR state = 'sent');
ALTER TABLE mailings ADD CONSTRAINT mailings_topic_for_supporters
  CHECK ((audience = 'supporters') = (topic IS NOT NULL));
ALTER TABLE mailings ADD CONSTRAINT mailings_politicians_by_email
  CHECK (audience = 'supporters' OR channel = 'email');
-- Only a draft may leave out when it goes, and who it's from.
ALTER TABLE mailings ADD CONSTRAINT mailings_scheduled_complete
  CHECK (body IS NULL OR state = 'draft' OR (due_at IS NOT NULL AND sent_from IS NOT NULL AND from_name IS NOT NULL));
ALTER TABLE mailings ADD CONSTRAINT mailings_created_by_check CHECK (created_by = lower(created_by));
ALTER TABLE mailings ADD CONSTRAINT mailings_sent_from_check CHECK (sent_from = lower(sent_from));
CREATE INDEX mailings_drafts ON mailings (opened_at) WHERE state = 'draft';

-- A file sent with each email of a mailing.
CREATE TABLE mailing_attachments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  mailing_id bigint NOT NULL REFERENCES mailings (id) ON DELETE CASCADE,
  filename text NOT NULL CHECK (filename <> ''),
  content_type text NOT NULL,
  content bytea NOT NULL CHECK (octet_length(content) <= 10485760),
  added_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mailing_attachments_mailing ON mailing_attachments (mailing_id);

-- A PauseAI letter of a mailing written here keeps the values its merge
-- fields had when the mailing was scheduled. One not sent, as its address
-- was blocked since or its politician left office, says which.
ALTER TABLE letters_from_pauseai
  ADD COLUMN merge_values jsonb,
  ADD COLUMN skip_reason text CHECK (skip_reason IN ('blocked', 'left-office'));
ALTER TABLE letters DROP CONSTRAINT letters_status_check;
ALTER TABLE letters ADD CONSTRAINT letters_status_check CHECK (
  status IN ('sending', 'sent', 'not_sent', 'bounced', 'spam_complaint')
  OR (kind = 'pauseai' AND status IN ('scheduled', 'cancelled', 'skipped')));

-- PauseAI's message to a supporter, in a mailing: one row per supporter,
-- with the address or number it went to and the values of its merge
-- fields. Erasing the supporter deletes those and keeps the row, so the
-- mailing's counts stay true.
CREATE TABLE messages_to_supporters (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  mailing_id bigint NOT NULL REFERENCES mailings (id) ON DELETE CASCADE,
  supporter_id bigint REFERENCES supporters (id) ON DELETE SET NULL,
  address text,
  status text NOT NULL CHECK (status IN ('scheduled', 'sent', 'delivered', 'failed', 'skipped')),
  provider_message_id text UNIQUE,
  merge_values jsonb,
  skip_reason text CHECK (skip_reason IN ('blocked', 'unsubscribed', 'no-permission')),
  sent_at timestamptz,
  UNIQUE (mailing_id, supporter_id),
  CHECK ((status = 'skipped') = (skip_reason IS NOT NULL)),
  CHECK (supporter_id IS NOT NULL OR (address IS NULL AND merge_values IS NULL))
);

-- Something that happened to a message, as its provider reported it.
-- Insert-only.
CREATE TABLE message_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message_id bigint NOT NULL REFERENCES messages_to_supporters (id) ON DELETE CASCADE,
  at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL CHECK (kind IN ('sent', 'delivered', 'failed', 'bounced', 'opted-out', 'replied')),
  details jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX message_events_message ON message_events (message_id, at);

-- A test copy of a mailing's email, sent to the staff member writing it.
ALTER TABLE email_sends DROP CONSTRAINT email_sends_purpose_check;
ALTER TABLE email_sends ADD CONSTRAINT email_sends_purpose_check
  CHECK (purpose IN ('letter', 'forwarded-reply', 'staff-login', 'staff-alert', 'mailing-test'));
