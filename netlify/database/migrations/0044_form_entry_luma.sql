-- The march sign-up is a form, and it adds each person to a Luma event:
-- what Luma said is a form entry's child, as a letter is, for any form that
-- registers people for an event.

ALTER TABLE form_entries DROP CONSTRAINT form_entries_form_check;
ALTER TABLE form_entries ADD CONSTRAINT form_entries_form_check
  CHECK (form IN ('email-your-mp', 'web-form', 'march-2026-11'));

-- `status` is what adding them came to: Luma took them (it adds guests in
-- the background, so not proof they're there), skipped them (unsubscribed,
-- removed or blocked on the calendar), the site had no key, or it failed.
CREATE TABLE form_entry_luma (
  entry_id bigint PRIMARY KEY REFERENCES form_entries (id) ON DELETE CASCADE,
  event_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('added', 'skipped', 'not-configured', 'failed'))
);

-- An entry without a letter is a line of its own: its form, where they came
-- from, and, if it registers for an event, what Luma said.
CREATE OR REPLACE VIEW supporter_activity_form AS
  SELECT s.entry_id AS source_id, l.created_at AS at, 'letter' AS kind, s.campaign AS title, p.name AS detail,
    '/staff/politicians/' || p.id AS href, l.status
  FROM supporter_letters s JOIN letters l ON l.id = s.id JOIN notable_people p ON p.id = l.notable_person_id
  UNION ALL
  SELECT s.entry_id, l.replied_at, 'letter-replied', s.campaign, p.name, '/staff/politicians/' || p.id, NULL::text
  FROM supporter_letters s JOIN letters l ON l.id = s.id JOIN notable_people p ON p.id = l.notable_person_id
  WHERE l.replied_at IS NOT NULL
  UNION ALL
  SELECT f.id, f.created_at, 'form-entry', f.form, f.utm_source, NULL::text, g.status
  FROM form_entries f LEFT JOIN form_entry_luma g ON g.entry_id = f.id
  WHERE NOT EXISTS (SELECT 1 FROM supporter_letters s WHERE s.entry_id = f.id);
