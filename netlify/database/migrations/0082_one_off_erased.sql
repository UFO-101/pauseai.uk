-- The one-off emails erased, so that reading their thread again, from either
-- mailbox, doesn't keep them again. The Message-ID is hashed, as it can name
-- the sender's domain.
CREATE TABLE one_off_erased (
  account text NOT NULL,
  gmail_message_id text NOT NULL,
  rfc_sha256 text,
  erased_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account, gmail_message_id)
);
CREATE INDEX one_off_erased_rfc ON one_off_erased (rfc_sha256);
