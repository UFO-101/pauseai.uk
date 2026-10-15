-- The letter's text isn't kept: nothing read it back, and the policy inbox
-- gets a BCC of each letter as sent (lib/server/mp-letters.ts), which is
-- where to look it up.
ALTER TABLE letters DROP COLUMN body;
ALTER TABLE letters DROP COLUMN body_html;
