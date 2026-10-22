-- The signatory import (lib/server/signatory-import.ts) gives each status it
-- sets the note in staffCopy.import.note. Statuses it set while that note was
-- a placeholder get the note's words. Only the status: the audit log keeps
-- what was written at the time. \2042 is the placeholder mark, written as an
-- escape so the placeholder check (tests/checks/placeholder-copy.test.ts)
-- doesn't take this file for copy.
UPDATE campaign_statuses SET note = 'From Airtable' WHERE note = U&'\2042 Ex Airtable';
