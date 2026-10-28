-- The rest of the Emails table's tick boxes, so the emails before 2026,
-- which the Emails sync now copies too, have their mailings. Each is named
-- as its box is.
INSERT INTO mailings (title, ask, airtable_field) VALUES
  ('Documentary Invitation', NULL, 'Documentary Invitation'),
  ('Westminster Hall Debate Invitation', NULL, 'Westminster Hall Debate Invitation'),
  ('Liability Bill', NULL, 'Liability Bill'),
  ('Frontier AI', NULL, 'Frontier AI')
ON CONFLICT (airtable_field) DO NOTHING;
