-- Letters can have bold, italic and bullet lists, so each is sent as HTML as
-- well as plain text (lib/letter-format.ts). body stays the plain text.
ALTER TABLE letters ADD COLUMN body_html text;
