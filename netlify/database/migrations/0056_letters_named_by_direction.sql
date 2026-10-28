-- Each letter table's name says which way the letter goes: a supporter's
-- letter to a politician, or PauseAI's.
ALTER TABLE supporter_letters RENAME TO letters_from_supporters;
ALTER TABLE letters_from_supporters RENAME CONSTRAINT supporter_letters_pkey TO letters_from_supporters_pkey;
ALTER TABLE letters_from_supporters RENAME CONSTRAINT supporter_letters_kind_check TO letters_from_supporters_kind_check;
ALTER TABLE letters_from_supporters RENAME CONSTRAINT supporter_letters_reply_hash_check TO letters_from_supporters_reply_hash_check;
ALTER TABLE letters_from_supporters RENAME CONSTRAINT supporter_letters_airtable_id_key TO letters_from_supporters_airtable_id_key;
ALTER TABLE letters_from_supporters RENAME CONSTRAINT supporter_letters_entry_id_key TO letters_from_supporters_entry_id_key;
ALTER TABLE letters_from_supporters RENAME CONSTRAINT supporter_letters_reply_hash_key TO letters_from_supporters_reply_hash_key;
ALTER TABLE letters_from_supporters RENAME CONSTRAINT supporter_letters_campaign_fkey TO letters_from_supporters_campaign_fkey;
ALTER TABLE letters_from_supporters RENAME CONSTRAINT supporter_letters_entry_id_fkey TO letters_from_supporters_entry_id_fkey;
ALTER TABLE letters_from_supporters RENAME CONSTRAINT supporter_letters_letter_fkey TO letters_from_supporters_letter_fkey;

ALTER TABLE pauseai_letters RENAME TO letters_from_pauseai;
ALTER TABLE letters_from_pauseai RENAME CONSTRAINT pauseai_letters_pkey TO letters_from_pauseai_pkey;
ALTER TABLE letters_from_pauseai RENAME CONSTRAINT pauseai_letters_kind_check TO letters_from_pauseai_kind_check;
ALTER TABLE letters_from_pauseai RENAME CONSTRAINT pauseai_letters_airtable_id_key TO letters_from_pauseai_airtable_id_key;
ALTER TABLE letters_from_pauseai RENAME CONSTRAINT pauseai_letters_id_kind_fkey TO letters_from_pauseai_id_kind_fkey;
ALTER TABLE letters_from_pauseai RENAME CONSTRAINT pauseai_letters_mailing_id_fkey TO letters_from_pauseai_mailing_id_fkey;
ALTER INDEX pauseai_letters_mailing RENAME TO letters_from_pauseai_mailing;

-- The old names, as views that read and write the renamed tables, for the
-- site deployed before this migration, which runs on until the deploy
-- that applies it is published. A later migration drops them.
CREATE VIEW supporter_letters AS SELECT * FROM letters_from_supporters;
CREATE VIEW pauseai_letters AS SELECT * FROM letters_from_pauseai;
