-- Politicians by address, as the blocked emails pages look each blocked
-- address up: whose it is, and so which page lists it.
CREATE INDEX notable_people_email ON notable_people (lower(email));
