-- Whether PauseAI's email to a politician was written with AI isn't kept:
-- nothing in Airtable has it ticked.
ALTER TABLE pauseai_letters DROP COLUMN ai_generated;
