-- What the staff pages for messages to supporters need.

-- A text's words, as WhatsApp approves them: one made on the site, by
-- whoever scheduled the first text on it, or with no one named, in
-- WhatsApp Manager. New words wait for approval; once approved a template
-- is never edited; rejected, it says why in plain words.
CREATE TABLE message_templates (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL CHECK (name <> ''),
  body jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  created_by text CHECK (created_by = lower(created_by)),
  approved_at timestamptz,
  rejected_at timestamptz,
  rejected_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'approved') = (approved_at IS NOT NULL)),
  CHECK ((status = 'rejected') = (rejected_at IS NOT NULL)),
  CHECK ((status = 'rejected') = (rejected_reason IS NOT NULL))
);

-- The template a text goes on. A draft with none is on new words, or none yet.
ALTER TABLE mailings ADD COLUMN template_id bigint REFERENCES message_templates (id) ON DELETE SET NULL;
ALTER TABLE mailings ADD CONSTRAINT mailings_template_for_texts CHECK (template_id IS NULL OR channel = 'text');
CREATE INDEX mailings_template ON mailings (template_id) WHERE template_id IS NOT NULL;

-- A message never sent, as its mailing was stopped first; and one skipped as
-- its number isn't on WhatsApp.
ALTER TABLE messages_to_supporters DROP CONSTRAINT messages_to_supporters_status_check;
ALTER TABLE messages_to_supporters ADD CONSTRAINT messages_to_supporters_status_check
  CHECK (status IN ('scheduled', 'sent', 'delivered', 'failed', 'skipped', 'cancelled'));
ALTER TABLE messages_to_supporters DROP CONSTRAINT messages_to_supporters_skip_reason_check;
ALTER TABLE messages_to_supporters ADD CONSTRAINT messages_to_supporters_skip_reason_check
  CHECK (skip_reason IN ('blocked', 'unsubscribed', 'no-permission', 'not-on-whatsapp'));
-- A supporter's page lists the messages they were sent.
CREATE INDEX messages_to_supporters_supporter ON messages_to_supporters (supporter_id);

-- A text's read receipt.
ALTER TABLE message_events DROP CONSTRAINT message_events_kind_check;
ALTER TABLE message_events ADD CONSTRAINT message_events_kind_check
  CHECK (kind IN ('sent', 'delivered', 'read', 'failed', 'bounced', 'opted-out', 'replied'));

-- What was said after a message: the supporter's reply, or with `sent_by`,
-- the staff member's answer from the site. Deleted when the supporter is erased.
CREATE TABLE message_replies (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message_id bigint NOT NULL REFERENCES messages_to_supporters (id) ON DELETE CASCADE,
  at timestamptz NOT NULL DEFAULT now(),
  body text NOT NULL CHECK (body <> ''),
  sent_by text CHECK (sent_by = lower(sent_by))
);
CREATE INDEX message_replies_message ON message_replies (message_id, at);
