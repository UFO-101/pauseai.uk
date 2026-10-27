-- The staff lists' searches ignore accents, and when nothing matches, offer
-- what's nearest what was typed (lib/server/search.ts).
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
