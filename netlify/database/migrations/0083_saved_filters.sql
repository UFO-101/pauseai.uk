-- Filters staff have saved on a list, shared with everyone who can open it.
-- `params` holds the list's URL parameters, as typed, so it can hold a
-- supporter's name, email or postcode: erasing them takes those out.
CREATE TABLE saved_filters (
  id         bigserial PRIMARY KEY,
  list       text NOT NULL CHECK (list IN ('politicians', 'supporters', 'events')),
  name       text NOT NULL,
  params     jsonb NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by text,
  updated_at timestamptz
);
