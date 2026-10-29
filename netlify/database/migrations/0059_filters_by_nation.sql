-- The politicians and supporters lists' Nation filter is `nation` in their
-- URLs, as the page names it. A mailing keeps the filter it was made from,
-- so those saved under the old name, `country`, take the new one.
UPDATE mailings
SET filter = jsonb_set(filter #- '{params,country}', '{params,nation}', filter -> 'params' -> 'country')
WHERE filter -> 'params' ? 'country';
