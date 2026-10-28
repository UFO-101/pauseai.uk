-- The constituency each looked-up postcode is in, so a supporter's page can
-- name their MP. A postcode looked up before this has none until it's looked
-- up again: lookUpPlaces does that for every row not constituency_checked.
ALTER TABLE postcode_places
  ADD COLUMN constituency text,
  ADD COLUMN constituency_checked boolean NOT NULL DEFAULT false;
