-- Whether a supporter follows the Luma calendar, apart from whether
-- they've opted out of its emails (luma_contact is both): the supporters
-- list keeps the first, and looks up an opt-out as it's read, so one from
-- Luma's webhook, or its end, shows at once, not at the next import.
CREATE OR REPLACE VIEW supporters_summary AS
 WITH ident AS (
         SELECT supporter_identity.supporter_id,
            (array_agg(supporter_identity.name ORDER BY supporter_identity.seen_at DESC NULLS LAST, supporter_identity.name) FILTER (WHERE (supporter_identity.name <> ''::text)))[1] AS name,
            array_agg(DISTINCT supporter_identity.email ORDER BY supporter_identity.email) AS emails,
            array_agg(DISTINCT supporter_identity.source ORDER BY supporter_identity.source) AS sources
           FROM public.supporter_identity
          GROUP BY supporter_identity.supporter_id
        ), act AS (
         SELECT supporter_activity.supporter_id,
            bool_or((supporter_activity.kind = 'luma-contact'::text)) AS luma_contact,
            max(supporter_activity.at) AS last_active_at,
            (count(*) FILTER (WHERE ((supporter_activity.kind = 'luma-registered'::text) AND (supporter_activity.detail <> 'declined'::text))))::integer AS events,
            (count(*) FILTER (WHERE (supporter_activity.kind = 'letter'::text)))::integer AS letters
           FROM public.supporter_activity
          GROUP BY supporter_activity.supporter_id
        ), contact AS (
         SELECT supporter_contact.supporter_id,
            (array_agg(supporter_contact.phone ORDER BY supporter_contact.at DESC, supporter_contact.phone) FILTER (WHERE (supporter_contact.phone IS NOT NULL)))[1] AS phone,
            (array_agg(supporter_contact.postcode ORDER BY supporter_contact.at DESC, supporter_contact.postcode) FILTER (WHERE (supporter_contact.postcode IS NOT NULL)))[1] AS postcode
           FROM public.supporter_contact
          GROUP BY supporter_contact.supporter_id
        ), mem AS (
         SELECT DISTINCT k.supporter_id
           FROM (public.supporter_links k
             JOIN public.members m ON ((m.id = k.member_id)))
          WHERE (m.removed_at IS NULL)
        )
 SELECT s.id,
    ident.name,
    ident.emails,
    contact.phone,
    contact.postcode,
    ident.sources,
    (COALESCE(act.luma_contact, false) AND (NOT (EXISTS ( SELECT 1
           FROM public.opt_outs o
          WHERE ((o.list = 'luma-calendar'::text) AND (o.resubscribed_at IS NULL) AND (o.address = ANY (ident.emails))))))) AS luma_contact,
    s.first_seen_at,
    act.last_active_at,
    COALESCE(act.events, 0) AS events,
    COALESCE(act.letters, 0) AS letters,
    (mem.supporter_id IS NOT NULL) AS member,
    COALESCE(act.luma_contact, false) AS luma_follows
   FROM ((((public.supporters s
     LEFT JOIN ident ON ((ident.supporter_id = s.id)))
     LEFT JOIN act ON ((act.supporter_id = s.id)))
     LEFT JOIN contact ON ((contact.supporter_id = s.id)))
     LEFT JOIN mem ON ((mem.supporter_id = s.id)));

DROP VIEW supporters_listed;
DROP FUNCTION supporters_added();
DROP MATERIALIZED VIEW supporters_list;

CREATE MATERIALIZED VIEW supporters_list AS
SELECT s.id, s.name, s.emails,
  (SELECT i.email FROM supporter_identity i WHERE i.supporter_id = s.id
   ORDER BY i.seen_at DESC NULLS LAST, i.email LIMIT 1) AS email,
  s.phone, s.postcode, s.sources, s.luma_follows, s.first_seen_at, s.last_active_at, s.events, s.letters, s.member,
  sp.place, sp.basis, sp.given, sp.country, sp.latitude, sp.longitude
FROM supporters_summary s LEFT JOIN supporter_place sp ON sp.supporter_id = s.id;

CREATE UNIQUE INDEX supporters_list_id ON supporters_list (id);
-- The list's default order, newest activity first.
CREATE INDEX supporters_list_active ON supporters_list (last_active_at DESC NULLS LAST, id DESC);

CREATE FUNCTION supporters_added() RETURNS SETOF supporters_list LANGUAGE plpgsql STABLE ROWS 10 AS $$
BEGIN
  RETURN QUERY
  SELECT x.* FROM supporters n CROSS JOIN LATERAL (
    SELECT s.id, s.name, s.emails,
      (SELECT i.email FROM supporter_identity i WHERE i.supporter_id = s.id
       ORDER BY i.seen_at DESC NULLS LAST, i.email LIMIT 1) AS email,
      s.phone, s.postcode, s.sources, s.luma_follows, s.first_seen_at, s.last_active_at, s.events, s.letters, s.member,
      sp.place, sp.basis, sp.given, sp.country, sp.latitude, sp.longitude
    FROM supporters_summary s LEFT JOIN supporter_place sp ON sp.supporter_id = s.id
    WHERE s.id = n.id OFFSET 0
  ) x
  WHERE n.id > (SELECT coalesce(max(l.id), 0) FROM supporters_list l);
END
$$;

CREATE VIEW supporters_listed AS
SELECT * FROM supporters_list
UNION ALL
SELECT * FROM supporters_added();
