-- Where supporters are, roughly, to find those near somewhere.

-- Each Luma event's tags, by name: a local group, Big events, Online.
ALTER TABLE luma_events ADD COLUMN tags text[] NOT NULL DEFAULT '{}';

-- Postcodes looked up at postcodes.io: where each is, its council area and
-- its nation (england, scotland, wales, northern-ireland). One it didn't
-- know is kept with no place, so it isn't asked about again. A postcode
-- alone says nothing of who gave it.
CREATE TABLE postcode_places (
  postcode text PRIMARY KEY CHECK (postcode = upper(replace(postcode, ' ', ''))),
  latitude double precision,
  longitude double precision,
  CHECK ((latitude IS NULL) = (longitude IS NULL)),
  place text,
  country text,
  looked_up_at timestamptz NOT NULL DEFAULT now()
);

-- Towns and cities looked up at postcodes.io by name: a supporter's city,
-- or an event's. As postcode_places, one it didn't know is kept with no place.
CREATE TABLE named_places (
  name text PRIMARY KEY CHECK (name = lower(trim(name))),
  latitude double precision,
  longitude double precision,
  CHECK ((latitude IS NULL) = (longitude IS NULL)),
  place text,
  country text,
  looked_up_at timestamptz NOT NULL DEFAULT now()
);

-- Each supporter's place, as best we know it: their newest postcode we
-- could place; else the newest city they gave us themselves; else where
-- their newest event was, leaving out big days and online ones, which say
-- nothing of where people live. `basis` says which; `given` is the postcode,
-- the city or the event's name.
CREATE VIEW supporter_place AS
WITH candidates AS (
  SELECT c.supporter_id, 1 AS rank, c.at, p.latitude, p.longitude, p.place, p.country,
    'postcode' AS basis, c.postcode AS given
  FROM supporter_contact c JOIN postcode_places p ON p.postcode = upper(replace(c.postcode, ' ', ''))
  WHERE p.latitude IS NOT NULL
  UNION ALL
  SELECT c.supporter_id, 2, c.at, n.latitude, n.longitude, n.place, n.country, 'city', c.city
  FROM supporter_contact c JOIN named_places n ON n.name = lower(trim(c.city))
  WHERE c.source <> 'luma' AND n.latitude IS NOT NULL
  UNION ALL
  SELECT k.supporter_id, 3, g.registered_at, e.latitude, e.longitude, coalesce(n.place, e.city), n.country,
    'event', e.name
  FROM luma_guests g
  JOIN supporter_links k ON k.luma_user_id = g.user_id
  JOIN luma_events e ON e.id = g.event_id
  LEFT JOIN named_places n ON n.name = lower(trim(e.city))
  WHERE e.latitude IS NOT NULL AND g.approval_status <> 'declined' AND NOT e.tags && ARRAY['Big events', 'Online']
)
SELECT DISTINCT ON (supporter_id) supporter_id, latitude, longitude, place, country, basis, given, at
FROM candidates ORDER BY supporter_id, rank, at DESC;
