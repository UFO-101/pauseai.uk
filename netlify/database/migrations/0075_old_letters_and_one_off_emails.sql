-- The letters written before the site could send them, and every other
-- thread with a politician, read once from the policy team's mailboxes
-- (lib/server/old-letters-import.ts), and new threads as they arrive
-- (lib/server/one-off-emails.ts).

-- A mailing's text from before the site could send: its template, in body's
-- format, as body itself marks a mailing written on the site. Approximate
-- when it's rebuilt from replies quoting it, as for letters whose own text
-- we can't read. old_letters_key names one the import made or uses, so
-- pressing it again finds it.
ALTER TABLE mailings
  ADD COLUMN imported_text jsonb,
  ADD COLUMN imported_text_approximate boolean NOT NULL DEFAULT false,
  ADD COLUMN old_letters_key text UNIQUE,
  ADD CONSTRAINT mailings_imported_text CHECK (imported_text IS NULL OR body IS NULL);

-- A letter of PauseAI's that doesn't fit its mailing's template keeps its
-- whole text here; one that does, its greeting and own paragraph in
-- merge_values.
ALTER TABLE letters_from_pauseai ADD COLUMN own_text text;

-- A form letter or a Postmark letter keeps its text too, with no proxy: a
-- form letter's draft is the form's text live then, with its names filled in.
ALTER TABLE letters_from_supporters
  DROP CONSTRAINT letters_from_supporters_letter,
  DROP CONSTRAINT letters_from_supporters_draft,
  ADD CONSTRAINT letters_from_supporters_letter CHECK (
    (proxy_id IS NULL OR letter IS NOT NULL) AND (proxy_id IS NULL) = (copy_state IS NULL)),
  ADD CONSTRAINT letters_from_supporters_draft CHECK (
    (draft IS NULL) = (draft_approximate IS NULL) AND (draft IS NULL) = (own_words IS NULL));

-- What each email said it was and who it was from, kept when it's sent; an
-- imported one is a letter Joseph sent, not the site, read from his Sent mail.
ALTER TABLE email_sends
  ADD COLUMN subject text,
  ADD COLUMN from_address text CHECK (from_address = lower(from_address)),
  ADD COLUMN imported boolean NOT NULL DEFAULT false;
CREATE INDEX email_sends_at ON email_sends (at DESC, id DESC);
CREATE INDEX email_sends_imported_thread ON email_sends (sender, gmail_thread_id) WHERE imported;

UPDATE email_sends e SET subject = m.subject, from_address = m.sent_from
FROM letters_from_pauseai p JOIN mailings m ON m.id = p.mailing_id
WHERE e.letter_id = p.id AND e.purpose = 'mailing';

UPDATE email_sends e SET from_address = e.sender WHERE e.purpose = 'mailing-test';

UPDATE email_sends e SET subject = s.subject,
  from_address = CASE WHEN p.tag IS NOT NULL AND e.sender IS NOT NULL
    THEN replace(e.sender, '@', '+' || p.tag || '@')
    WHEN s.postmark_mailbox IS NOT NULL THEN lower(s.postmark_mailbox) || '@letters.pauseai.uk' END
FROM letters_from_supporters s LEFT JOIN proxies p ON p.id = s.proxy_id
WHERE e.letter_id = s.id AND e.purpose = 'letter';

-- An office may write from a politician's own domain, which also says whose
-- thread it is: only one held by one politician, as Parliament lists them.
CREATE TABLE politician_domains (
  domain text PRIMARY KEY CHECK (domain = lower(domain)),
  notable_person_id bigint NOT NULL REFERENCES notable_people (id) ON DELETE CASCADE,
  seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX politician_domains_person ON politician_domains (notable_person_id);

-- One-off emails: a thread with a politician that isn't a letter of a
-- campaign or mailing. someone_else: a sender in it is neither a politician
-- nor one of PauseAI's accounts, so only staff with `supporters` see it.
CREATE TABLE one_off_threads (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subject text NOT NULL DEFAULT '',
  someone_else boolean NOT NULL DEFAULT false,
  latest_at timestamptz NOT NULL
);
CREATE INDEX one_off_threads_latest ON one_off_threads (latest_at DESC, id DESC);

CREATE TABLE one_off_thread_people (
  thread_id bigint NOT NULL REFERENCES one_off_threads (id) ON DELETE CASCADE,
  notable_person_id bigint NOT NULL REFERENCES notable_people (id) ON DELETE CASCADE,
  PRIMARY KEY (thread_id, notable_person_id)
);
CREATE INDEX one_off_thread_people_person ON one_off_thread_people (notable_person_id);

-- One message, kept once by its Message-ID however many mailboxes hold it.
-- addresses is everyone on it, lowercased, which a supporter's page and
-- erasure find it by.
CREATE TABLE one_off_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  thread_id bigint NOT NULL REFERENCES one_off_threads (id) ON DELETE CASCADE,
  account text NOT NULL CHECK (account = lower(account)),
  gmail_message_id text NOT NULL,
  gmail_thread_id text NOT NULL,
  rfc_message_id text,
  in_reply_to text[] NOT NULL DEFAULT '{}',
  from_address text NOT NULL CHECK (from_address = lower(from_address)),
  from_name text NOT NULL DEFAULT '',
  to_line text NOT NULL DEFAULT '',
  cc_line text NOT NULL DEFAULT '',
  addresses text[] NOT NULL,
  subject text NOT NULL DEFAULT '',
  at timestamptz NOT NULL,
  from_us boolean NOT NULL,
  blob_key text NOT NULL UNIQUE,
  size integer NOT NULL CHECK (size >= 0),
  UNIQUE (account, gmail_message_id)
);
CREATE UNIQUE INDEX one_off_messages_rfc ON one_off_messages (rfc_message_id) WHERE rfc_message_id IS NOT NULL;
CREATE INDEX one_off_messages_thread ON one_off_messages (thread_id, at);
CREATE INDEX one_off_messages_gmail_thread ON one_off_messages (account, gmail_thread_id);
CREATE INDEX one_off_messages_addresses ON one_off_messages USING gin (addresses);

-- Mail in policy@ and the group's archive that matched nothing: only its
-- Gmail ID, so it's reported once, its sender and subject read again then.
CREATE TABLE unmatched_mail (
  account text NOT NULL CHECK (account = lower(account)),
  gmail_message_id text NOT NULL,
  found_at timestamptz NOT NULL DEFAULT now(),
  reported_at timestamptz,
  PRIMARY KEY (account, gmail_message_id)
);
CREATE INDEX unmatched_mail_waiting ON unmatched_mail (found_at) WHERE reported_at IS NULL;

-- The import's place: each message it has listed, and once handled, what
-- became of it. Its IDs, and which letter it joined, never its text, but for
-- a quote of a letter whose own text we can't read, until its template is
-- rebuilt. A dry run has rows of its own, which a real run deletes.
CREATE TABLE old_letters_mail (
  dry_run boolean NOT NULL,
  account text NOT NULL CHECK (account = lower(account)),
  gmail_message_id text NOT NULL,
  source text NOT NULL CHECK (source IN ('sent', 'received', 'group', 'policy', 'thread')),
  gmail_thread_id text,
  rfc_message_id text,
  letter_id bigint REFERENCES letters (id) ON DELETE SET NULL,
  mailing_key text,
  outcome text CHECK (outcome IN ('joined', 'added', 'reply', 'auto_reply', 'one_off', 'unmatched', 'skipped')),
  quoted text,
  PRIMARY KEY (dry_run, account, gmail_message_id)
);
CREATE INDEX old_letters_mail_waiting ON old_letters_mail (dry_run, source) WHERE outcome IS NULL;
CREATE INDEX old_letters_mail_rfc ON old_letters_mail (dry_run, rfc_message_id) WHERE letter_id IS NOT NULL;
CREATE INDEX old_letters_mail_thread ON old_letters_mail (dry_run, account, gmail_thread_id) WHERE letter_id IS NOT NULL;
CREATE INDEX old_letters_mail_letter ON old_letters_mail (letter_id);

ALTER TABLE import_runs DROP CONSTRAINT import_runs_job_check;
ALTER TABLE import_runs ADD CONSTRAINT import_runs_job_check CHECK (job IN (
  'sync-politicians', 'check-mps', 'import-controlai', 'import-signatories', 'import-luma', 'import-members',
  'sync-emails', 'import-web-form-letters', 'import-go-to-parliament', 'read-gmail', 'import-old-letters'));

-- When each account first saw each page in the navigation, which shows as
-- new for 3 days. Every account and page that exists now has long since seen
-- it, so only the pages added with this change show as new.
CREATE TABLE staff_nav_seen (
  email text NOT NULL REFERENCES staff_accounts (email) ON DELETE CASCADE,
  page text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (email, page)
);
INSERT INTO staff_nav_seen (email, page, first_seen_at)
SELECT a.email, p.page, '2000-01-01'
FROM staff_accounts a CROSS JOIN unnest(ARRAY['supporters', 'supporterEmails', 'politicians', 'asks', 'mailings',
  'mpEmails', 'events', 'import', 'accounts', 'changes']) AS p (page);
