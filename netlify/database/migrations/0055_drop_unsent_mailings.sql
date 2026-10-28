-- Liability Bill and Frontier AI have tick boxes in Airtable's Emails table,
-- but no email ticked: those campaigns didn't go through it, so the import
-- has nothing to put in them. Removed, but only while they have no letters;
-- should their boxes be ticked, the import reports those emails, and a
-- migration adds the mailings back.
DELETE FROM mailings m
WHERE m.airtable_field IN ('Liability Bill', 'Frontier AI')
  AND NOT EXISTS (SELECT 1 FROM pauseai_letters p WHERE p.mailing_id = m.id);
