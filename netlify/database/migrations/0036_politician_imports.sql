-- The imports from Airtable's UK Parliamentarians base: the nightly sync of
-- every politician, which takes over the MP sync's runs, the nightly copy
-- of PauseAI's 2026 emails to them, and two one-off imports.

-- A held MP sync kept only MPs, so applying it now would mark everyone
-- else as gone: it's discarded, and the next sync holds its own.
UPDATE import_runs SET status = 'discarded', decided_by = 'sync', decided_at = now()
  WHERE job = 'sync-mps' AND status = 'held';
ALTER TABLE import_runs DROP CONSTRAINT import_runs_job_check;
UPDATE import_runs SET job = 'sync-politicians' WHERE job = 'sync-mps';
ALTER TABLE import_runs ADD CONSTRAINT import_runs_job_check CHECK (job IN (
  'sync-politicians', 'check-mps', 'import-controlai', 'import-signatories', 'import-luma', 'import-members',
  'sync-emails', 'import-web-form-letters', 'import-go-to-parliament'
));

-- ------------------------------------------------------------- mailings

-- One mail from PauseAI to many people, and the ask it makes, if any. Those
-- sent before the site could send them are copied from Airtable's Emails
-- table, where each is a tick box, and named as it is: they have no text.
CREATE TABLE mailings (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  ask text REFERENCES asks (slug),
  airtable_field text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO mailings (title, ask, airtable_field) VALUES
  ('CSRB Iqbal Amendment', NULL, 'CSRB Iqbal Amendment'),
  ('Edinburgh Conference Nov 26 Invitation', 'edinburgh-conference-2026', 'Edinburgh Conference Nov 26 Invitation'),
  ('Ben Lake October 2026 Debate', NULL, 'Ben Lake October 2026 Debate');

-- ------------------------------------------------------- PauseAI letters

-- A letter is a supporter's or PauseAI's. Only PauseAI's can wait to be
-- sent, or be cancelled.
ALTER TABLE letters DROP CONSTRAINT letters_kind_check;
ALTER TABLE letters ADD CONSTRAINT letters_kind_check CHECK (kind IN ('supporter', 'pauseai'));
ALTER TABLE letters DROP CONSTRAINT letters_status_check;
ALTER TABLE letters ADD CONSTRAINT letters_status_check CHECK (
  status IN ('sending', 'sent', 'not_sent', 'bounced', 'spam_complaint')
  OR (kind = 'pauseai' AND status IN ('scheduled', 'cancelled'))
);

-- One person's letter of a mailing. One copied from Airtable is keyed by
-- its record, and says only whether it was personalised and whether AI
-- wrote it.
CREATE TABLE pauseai_letters (
  id bigint PRIMARY KEY,
  kind text NOT NULL DEFAULT 'pauseai' CHECK (kind = 'pauseai'),
  mailing_id bigint NOT NULL REFERENCES mailings (id),
  airtable_id text UNIQUE,
  personalised boolean NOT NULL DEFAULT false,
  ai_generated boolean NOT NULL DEFAULT false,
  FOREIGN KEY (id, kind) REFERENCES letters (id, kind) ON DELETE CASCADE
);
CREATE INDEX pauseai_letters_mailing ON pauseai_letters (mailing_id);

-- ------------------------------------------------- web form letters

-- A supporter's letter sent through pauseai.info's old form is keyed by its
-- Airtable record. It had no address of its own for replies, so no
-- reply_hash.
ALTER TABLE supporter_letters ADD COLUMN airtable_id text UNIQUE;
ALTER TABLE supporter_letters ALTER COLUMN reply_hash DROP NOT NULL;
ALTER TABLE supporter_letters ADD CONSTRAINT supporter_letters_reply_hash_check
  CHECK ((reply_hash IS NULL) = (airtable_id IS NOT NULL));

-- A supporter who wrote through the old form has it as their source, rather
-- than the site's letter.
CREATE OR REPLACE VIEW supporter_identity AS
  SELECT k.supporter_id, 'luma'::text AS source, s.email, s.name, s.seen_at
  FROM supporter_source_luma s JOIN supporter_links k ON k.luma_user_id = s.source_id
  UNION ALL
  SELECT k.supporter_id, CASE WHEN x.airtable_id IS NULL THEN 'letter' ELSE 'web-form' END, s.email, s.name, s.seen_at
  FROM supporter_source_letter s JOIN supporter_links k ON k.letter_id = s.source_id
    JOIN supporter_letters x ON x.id = s.source_id
  UNION ALL
  SELECT k.supporter_id, 'member', s.email, s.name, s.seen_at
  FROM supporter_source_member s JOIN supporter_links k ON k.member_id = s.source_id;
