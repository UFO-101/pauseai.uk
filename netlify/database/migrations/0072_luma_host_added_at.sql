-- When each host was added, as far as the import can tell: empty for those
-- on the first read of an event's hosts, who may have been there since it
-- was made, and the time of the read that first found them for those added
-- since. Luma doesn't say when someone became a host.
ALTER TABLE luma_event_hosts ADD COLUMN added_at timestamptz;

-- A supporter's activity dates an event they host when they were added, or,
-- for a host from the first read, when the event was made, or first seen
-- before that was copied.
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
    COALESCE(h.added_at, e.created_at, e.first_seen_at) AS at,
    'luma-hosted'::text AS kind,
    e.name AS title,
    NULL::text AS detail,
    ('https://luma.com/'::text || e.url) AS href,
    NULL::text AS status
   FROM ((luma_event_hosts h
     JOIN luma_events e ON ((e.id = h.event_id)))
     JOIN supporter_links k ON ((k.luma_user_id = h.user_id)));

REFRESH MATERIALIZED VIEW supporters_list;
