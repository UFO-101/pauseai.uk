-- Each of our events' hosts, as Luma's event details list them, copied by
-- the hourly import (lib/server/luma-import.ts). A host is a Luma user, in
-- luma_people as a guest is, so erasing them takes their host rows with
-- them. After a complete read, hosts no longer listed are deleted.
ALTER TABLE luma_events
  -- When the event was made on Luma, from the calendar's list.
  ADD COLUMN created_at timestamptz,
  -- The last complete read of its hosts, and why the last read failed, if it did.
  ADD COLUMN hosts_synced_at timestamptz,
  ADD COLUMN hosts_error text;

CREATE TABLE luma_event_hosts (
  event_id text NOT NULL REFERENCES luma_events (id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES luma_people (user_id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, user_id)
);
CREATE INDEX luma_event_hosts_user ON luma_event_hosts (user_id);

-- A supporter's activity gains the events they hosted, dated when the event
-- was made, or first seen before that was copied.
CREATE OR REPLACE VIEW supporter_activity AS
 SELECT k.supporter_id,
    'luma'::text AS source,
    p.contact_since AS at,
    'luma-contact'::text AS kind,
    NULL::text AS title,
    NULL::text AS detail,
    NULL::text AS href,
    NULL::text AS status
   FROM (luma_people p
     JOIN supporter_links k ON ((k.luma_user_id = p.user_id)))
  WHERE (p.contact_since IS NOT NULL)
UNION ALL
 SELECT k.supporter_id,
    'luma'::text AS source,
    g.registered_at AS at,
    'luma-registered'::text AS kind,
    e.name AS title,
    g.approval_status AS detail,
    ('https://luma.com/'::text || e.url) AS href,
    NULL::text AS status
   FROM ((luma_guests g
     JOIN luma_events e ON ((e.id = g.event_id)))
     JOIN supporter_links k ON ((k.luma_user_id = g.user_id)))
  WHERE (g.removed_at IS NULL)
UNION ALL
 SELECT k.supporter_id,
    f.form AS source,
    a.at,
    a.kind,
    a.title,
    a.detail,
    a.href,
    a.status
   FROM ((supporter_activity_form a
     JOIN supporter_links k ON ((k.form_entry_id = a.source_id)))
     JOIN form_entries f ON ((f.id = a.source_id)))
UNION ALL
 SELECT k.supporter_id,
    o.source,
    o.unsubscribed_at AS at,
    'opted-out'::text AS kind,
    o.list AS title,
    o.address AS detail,
    NULL::text AS href,
    NULL::text AS status
   FROM (opt_outs o
     JOIN ( SELECT DISTINCT supporter_links.supporter_id,
            supporter_links.matched_value
           FROM supporter_links) k ON ((k.matched_value = o.address)))
UNION ALL
 SELECT k.supporter_id,
    o.source,
    o.resubscribed_at AS at,
    'resubscribed'::text AS kind,
    o.list AS title,
    o.address AS detail,
    NULL::text AS href,
    NULL::text AS status
   FROM (opt_outs o
     JOIN ( SELECT DISTINCT supporter_links.supporter_id,
            supporter_links.matched_value
           FROM supporter_links) k ON ((k.matched_value = o.address)))
  WHERE (o.resubscribed_at IS NOT NULL)
UNION ALL
 SELECT k.supporter_id,
    'member'::text AS source,
    a.at,
    a.kind,
    a.title,
    a.detail,
    a.href,
    a.status
   FROM (supporter_activity_member a
     JOIN supporter_links k ON ((k.member_id = a.source_id)))
UNION ALL
 SELECT k.supporter_id,
    'luma'::text AS source,
    COALESCE(e.created_at, e.first_seen_at) AS at,
    'luma-hosted'::text AS kind,
    e.name AS title,
    NULL::text AS detail,
    ('https://luma.com/'::text || e.url) AS href,
    NULL::text AS status
   FROM ((luma_event_hosts h
     JOIN luma_events e ON ((e.id = h.event_id)))
     JOIN supporter_links k ON ((k.luma_user_id = h.user_id)));

-- Their count of events is of different events, registered for (not
-- declined) or hosted: one they registered for and host counts once. An
-- event's href is its own.
CREATE OR REPLACE VIEW supporters_summary AS
 WITH ident AS (
         SELECT supporter_identity.supporter_id,
            (array_agg(supporter_identity.name ORDER BY supporter_identity.seen_at DESC NULLS LAST, supporter_identity.name) FILTER (WHERE (supporter_identity.name <> ''::text)))[1] AS name,
            array_agg(DISTINCT supporter_identity.email ORDER BY supporter_identity.email) AS emails,
            array_agg(DISTINCT supporter_identity.source ORDER BY supporter_identity.source) AS sources
           FROM supporter_identity
          GROUP BY supporter_identity.supporter_id
        ), act AS (
         SELECT supporter_activity.supporter_id,
            bool_or((supporter_activity.kind = 'luma-contact'::text)) AS luma_contact,
            max(supporter_activity.at) AS last_active_at,
            (count(DISTINCT supporter_activity.href) FILTER (WHERE (((supporter_activity.kind = 'luma-registered'::text) AND (supporter_activity.detail <> 'declined'::text)) OR (supporter_activity.kind = 'luma-hosted'::text))))::integer AS events,
            (count(*) FILTER (WHERE (supporter_activity.kind = 'letter'::text)))::integer AS letters
           FROM supporter_activity
          GROUP BY supporter_activity.supporter_id
        ), contact AS (
         SELECT supporter_contact.supporter_id,
            (array_agg(supporter_contact.phone ORDER BY supporter_contact.at DESC, supporter_contact.phone) FILTER (WHERE (supporter_contact.phone IS NOT NULL)))[1] AS phone,
            (array_agg(supporter_contact.postcode ORDER BY supporter_contact.at DESC, supporter_contact.postcode) FILTER (WHERE (supporter_contact.postcode IS NOT NULL)))[1] AS postcode
           FROM supporter_contact
          GROUP BY supporter_contact.supporter_id
        ), mem AS (
         SELECT DISTINCT k.supporter_id
           FROM (supporter_links k
             JOIN members m ON ((m.id = k.member_id)))
          WHERE (m.removed_at IS NULL)
        ), ph AS (
         SELECT n.supporter_id,
            array_agg(n.number ORDER BY n.at DESC, n.number) AS phones
           FROM ( SELECT c.supporter_id,
                    phone_number(c.phone) AS number,
                    max(c.at) AS at
                   FROM supporter_contact c
                  WHERE (phone_number(c.phone) IS NOT NULL)
                  GROUP BY c.supporter_id, (phone_number(c.phone))) n
          GROUP BY n.supporter_id
        )
 SELECT s.id,
    ident.name,
    ident.emails,
    contact.phone,
    contact.postcode,
    ident.sources,
    (COALESCE(act.luma_contact, false) AND (NOT (EXISTS ( SELECT 1
           FROM opt_outs o
          WHERE ((o.list = 'luma-calendar'::text) AND (o.resubscribed_at IS NULL) AND (o.address = ANY (ident.emails))))))) AS luma_contact,
    s.first_seen_at,
    act.last_active_at,
    COALESCE(act.events, 0) AS events,
    COALESCE(act.letters, 0) AS letters,
    (mem.supporter_id IS NOT NULL) AS member,
    COALESCE(act.luma_contact, false) AS luma_follows,
    COALESCE(ph.phones, '{}'::text[]) AS phones
   FROM (((((supporters s
     LEFT JOIN ident ON ((ident.supporter_id = s.id)))
     LEFT JOIN act ON ((act.supporter_id = s.id)))
     LEFT JOIN contact ON ((contact.supporter_id = s.id)))
     LEFT JOIN mem ON ((mem.supporter_id = s.id)))
     LEFT JOIN ph ON ((ph.supporter_id = s.id)));

REFRESH MATERIALIZED VIEW supporters_list;
