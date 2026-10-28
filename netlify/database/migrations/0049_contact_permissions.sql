-- Whether we may contact an address or a phone number about each topic,
-- and why: contact_permission(), the one place the rules are written down,
-- for email and phone alike. An answer is for one topic, one channel and
-- one address: someone who gave Luma one number and the join form another
-- has an answer for each. Every address and number is kept, to say which
-- records are one person, whatever its answers.

-- A phone number as we compare them: E.164 where it can be read as one (a
-- UK number written from 0, or with +44 (0) or 00, becomes +44...), and as
-- typed, trimmed, where it can't; null for a blank.
CREATE FUNCTION phone_number(raw text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
SELECT CASE
  WHEN d IS NULL OR d = '' THEN NULL
  WHEN d ~ '^\+440[1-9][0-9]{8,9}$' THEN '+44' || substr(d, 5)
  WHEN d ~ '^\+[1-9][0-9]{6,14}$' THEN d
  WHEN d ~ '^00[1-9][0-9]{6,14}$' THEN '+' || substr(d, 3)
  WHEN d ~ '^0[1-9][0-9]{8,9}$' THEN '+44' || substr(d, 2)
  WHEN d ~ '^44[1-9][0-9]{9}$' THEN '+' || d
  ELSE btrim(raw) END
FROM (SELECT regexp_replace(raw, '[[:space:]().-]', '', 'g') AS d) n
$$;

CREATE INDEX luma_guests_phone ON luma_guests (phone_number(phone));
CREATE INDEX members_phone ON members (phone_number(phone));
CREATE INDEX form_entries_phone ON form_entries (phone_number(phone));

-- A form that asks for a number "for text updates on the day", and when
-- that day ends: until then, march-day says yes to the numbers it was given.
CREATE TABLE day_texts (
  form text PRIMARY KEY,
  ends_at timestamptz NOT NULL
);
INSERT INTO day_texts (form, ends_at) VALUES ('march-2026-11', '2026-11-22T00:00:00Z');

-- An opt-out is from a topic by one channel; every one so far is by email.
ALTER TABLE opt_outs ADD COLUMN channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'phone'));
DROP INDEX opt_outs_open;
CREATE UNIQUE INDEX opt_outs_open ON opt_outs (channel, address, list) WHERE resubscribed_at IS NULL;

-- Whether we may contact an address by a channel about a topic, and why.
-- `send` is yes, no, or unsure: a yes we can't be sure still holds.
-- `reason` says why. By email, as before:
--
-- - blocked: an email to it bounced hard or was marked as spam, so nothing
--   goes to it, whatever the topic;
-- - unsubscribed: it told us no, through the source's own unsubscribe;
-- - declined: it left the box unticked: "Keep me informed" on joining, or
--   the consent box on a form;
-- - asked: it ticked the box freely;
-- - joined: it joined PauseAI before 30 June 2026, when "Keep me informed"
--   became a free choice and everyone who joined was on the updates;
-- - following: it follows the Luma calendar;
-- - not-following: it never followed the calendar, though it registered
--   for an event;
-- - removed: it was a member, but isn't shared with us any more.
--
-- By phone:
--
-- - luma-calendar: a number given at a Luma registration was given to the
--   calendar's host by a Luma account, so it has that account's answer:
--   following, unsubscribed (the account unsubscribed from the calendar's
--   emails) or not-following. Of several accounts that gave it, the one
--   that says yes, else the newest;
-- - volunteering: the join form asks for a number only of those who choose
--   to volunteer, for volunteers' messages: volunteered, from the newest
--   member record that gave it; gave-number, unsure, from one with another
--   intent (an older form's); removed, once it isn't shared with us;
-- - site-forms: the consent box on the newest form entry that gave it,
--   which on the march's says "by email and phone": asked or declined;
-- - march-day: a form's "for text updates on the day", a yes until the
--   day ends (day_texts): gave-number, then ended.
--
-- `at` is since when, and `source` which source told us. The first rule
-- that matches, in `rank` order, is the answer.
CREATE FUNCTION contact_permission(for_topic text, for_channel text, for_address text)
RETURNS TABLE (send text, reason text, at timestamptz, source text)
LANGUAGE sql STABLE AS $$
SELECT r.send, r.reason, r.at, r.source FROM (
  -- A blocked address overrides everything.
  SELECT 1, 'no', 'blocked', p.at, p.kind
  FROM email_blocks b JOIN email_problems p ON p.id = b.problem_id
  WHERE for_channel = 'email' AND b.address = for_address
  UNION ALL
  -- Then an opt-out in force.
  SELECT 2, 'no', 'unsubscribed', o.unsubscribed_at, o.source
  FROM opt_outs o
  WHERE o.channel = for_channel AND o.address = for_address AND o.list = for_topic AND o.resubscribed_at IS NULL
  UNION ALL
  -- A contact of the calendar.
  SELECT 3, 'yes', 'following', f.since, 'luma'
  FROM (SELECT min(l.contact_since) AS since FROM luma_people l WHERE l.email = for_address) f
  WHERE for_channel = 'email' AND for_topic = 'luma-calendar' AND f.since IS NOT NULL
  UNION ALL
  SELECT 4, 'no', 'not-following', NULL, NULL WHERE for_channel = 'email' AND for_topic = 'luma-calendar'
  UNION ALL
  -- The newest member record, one still shared before one removed. Every
  -- yes is unsure: the updates are sent from CiviCRM, whose unsubscribes
  -- we don't read.
  SELECT 3,
    CASE WHEN m.removed_at IS NOT NULL THEN 'no'
      WHEN m.created_at < '2026-06-30T00:00:00Z' OR m.keep_informed THEN 'unsure' ELSE 'no' END,
    CASE WHEN m.removed_at IS NOT NULL THEN 'removed'
      WHEN m.created_at < '2026-06-30T00:00:00Z' THEN 'joined'
      WHEN m.keep_informed THEN 'asked' ELSE 'declined' END,
    m.created_at, 'member'
  FROM (SELECT * FROM members m WHERE m.email = for_address
        ORDER BY m.removed_at IS NOT NULL, m.created_at DESC, m.id LIMIT 1) m
  WHERE for_channel = 'email' AND for_topic = 'pauseai-updates'
  UNION ALL
  -- The box on the newest form entry.
  SELECT 3, CASE WHEN f.contact_consent THEN 'yes' ELSE 'no' END,
    CASE WHEN f.contact_consent THEN 'asked' ELSE 'declined' END, f.created_at, f.form
  FROM (SELECT * FROM form_entries f WHERE for_channel = 'email' AND lower(trim(f.email)) = for_address
        UNION ALL
        SELECT * FROM form_entries f WHERE for_channel = 'phone' AND phone_number(f.phone) = for_address
        ORDER BY created_at DESC, id DESC LIMIT 1) f
  WHERE for_topic = 'site-forms'
  UNION ALL
  -- The answer of the Luma account that gave the number.
  SELECT 3, a.send, a.reason, a.at, 'luma'
  FROM (SELECT
          CASE WHEN o.id IS NULL AND l.contact_since IS NOT NULL THEN 'yes' ELSE 'no' END AS send,
          CASE WHEN o.id IS NOT NULL THEN 'unsubscribed'
            WHEN l.contact_since IS NOT NULL THEN 'following' ELSE 'not-following' END AS reason,
          coalesce(o.unsubscribed_at, l.contact_since) AS at
        FROM luma_people l
          LEFT JOIN opt_outs o ON o.channel = 'email' AND o.list = 'luma-calendar' AND o.address = l.email
            AND o.resubscribed_at IS NULL
        WHERE l.user_id IN (SELECT g.user_id FROM luma_guests g WHERE phone_number(g.phone) = for_address)
        ORDER BY o.id IS NULL AND l.contact_since IS NOT NULL DESC, coalesce(o.unsubscribed_at, l.contact_since) DESC NULLS LAST
        LIMIT 1) a
  WHERE for_channel = 'phone' AND for_topic = 'luma-calendar'
  UNION ALL
  -- The newest member record that gave the number, one still shared first.
  SELECT 3,
    CASE WHEN m.removed_at IS NOT NULL THEN 'no' WHEN m.intent = 'Volunteer' THEN 'yes' ELSE 'unsure' END,
    CASE WHEN m.removed_at IS NOT NULL THEN 'removed' WHEN m.intent = 'Volunteer' THEN 'volunteered' ELSE 'gave-number' END,
    m.created_at, 'member'
  FROM (SELECT * FROM members m WHERE phone_number(m.phone) = for_address
        ORDER BY m.removed_at IS NOT NULL, m.created_at DESC, m.id LIMIT 1) m
  WHERE for_channel = 'phone' AND for_topic = 'volunteering'
  UNION ALL
  -- The newest entry on a form with texts on the day, until the day ends.
  SELECT 3, CASE WHEN now() < f.ends_at THEN 'yes' ELSE 'no' END,
    CASE WHEN now() < f.ends_at THEN 'gave-number' ELSE 'ended' END, f.created_at, f.form
  FROM (SELECT f.*, d.ends_at FROM form_entries f JOIN day_texts d ON d.form = f.form
        WHERE phone_number(f.phone) = for_address ORDER BY f.created_at DESC, f.id DESC LIMIT 1) f
  WHERE for_channel = 'phone' AND for_topic = 'march-day'
) r (rank, send, reason, at, source)
ORDER BY r.rank LIMIT 1
$$;

-- The answer for each address or number and topic it has had anything to
-- do with, a view for each channel and one of both. A topic it never had
-- anything to do with has no row: we'd never contact it about that.
CREATE OR REPLACE VIEW email_permissions AS
SELECT t.topic, t.address, d.send, d.reason, d.at, d.source
FROM (
  SELECT 'luma-calendar' AS topic, email AS address FROM luma_people
  UNION SELECT 'pauseai-updates', email FROM members
  UNION SELECT 'site-forms', lower(trim(email)) FROM form_entries
  UNION SELECT list, address FROM opt_outs WHERE channel = 'email' AND resubscribed_at IS NULL
) t
CROSS JOIN LATERAL contact_permission(t.topic, 'email', t.address) d;

CREATE VIEW phone_permissions AS
SELECT t.topic, t.address, d.send, d.reason, d.at, d.source
FROM (
  SELECT 'luma-calendar' AS topic, phone_number(phone) AS address FROM luma_guests WHERE phone_number(phone) IS NOT NULL
  UNION SELECT 'volunteering', phone_number(phone) FROM members WHERE phone_number(phone) IS NOT NULL
  UNION SELECT 'site-forms', phone_number(phone) FROM form_entries WHERE phone_number(phone) IS NOT NULL
  UNION SELECT 'march-day', phone_number(phone) FROM form_entries
    WHERE form IN (SELECT form FROM day_texts) AND phone_number(phone) IS NOT NULL
  UNION SELECT list, address FROM opt_outs WHERE channel = 'phone' AND resubscribed_at IS NULL
) t
CROSS JOIN LATERAL contact_permission(t.topic, 'phone', t.address) d;

CREATE VIEW contact_permissions AS
SELECT topic, 'email' AS channel, address, send, reason, at, source FROM email_permissions
UNION ALL
SELECT topic, 'phone', address, send, reason, at, source FROM phone_permissions;

-- Whether any topic says we may contact a number, or might.
CREATE FUNCTION phone_usable(number text) RETURNS boolean LANGUAGE sql STABLE AS $$
SELECT EXISTS (
  SELECT 1 FROM unnest(ARRAY['luma-calendar', 'site-forms', 'volunteering', 'march-day']) t (topic)
    CROSS JOIN LATERAL contact_permission(t.topic, 'phone', number) d
  WHERE d.send <> 'no')
$$;

-- The email rules, as they were asked for before the phone's.
CREATE OR REPLACE FUNCTION email_permission(for_topic text, for_address text)
RETURNS TABLE (send text, reason text, at timestamptz, source text)
LANGUAGE sql STABLE AS $$
SELECT * FROM contact_permission(for_topic, 'email', for_address)
$$;

-- Every number a supporter gave, newest first, beside the newest any
-- source gave: the list shows the newest we may use.
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
        ), ph AS (
         SELECT n.supporter_id, array_agg(n.number ORDER BY n.at DESC, n.number) AS phones
           FROM (SELECT c.supporter_id, phone_number(c.phone) AS number, max(c.at) AS at
                   FROM public.supporter_contact c WHERE phone_number(c.phone) IS NOT NULL
                  GROUP BY c.supporter_id, phone_number(c.phone)) n
          GROUP BY n.supporter_id
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
    COALESCE(act.luma_contact, false) AS luma_follows,
    COALESCE(ph.phones, '{}'::text[]) AS phones
   FROM (((((public.supporters s
     LEFT JOIN ident ON ((ident.supporter_id = s.id)))
     LEFT JOIN act ON ((act.supporter_id = s.id)))
     LEFT JOIN contact ON ((contact.supporter_id = s.id)))
     LEFT JOIN mem ON ((mem.supporter_id = s.id)))
     LEFT JOIN ph ON ((ph.supporter_id = s.id)));

-- The list as before, with every number they gave, newest first, at the end.
DROP VIEW supporters_listed;
DROP FUNCTION supporters_added();
DROP MATERIALIZED VIEW supporters_list;

CREATE MATERIALIZED VIEW supporters_list AS
SELECT s.id, s.name, s.emails, newest.email,
  s.phone, s.postcode, s.sources, s.luma_follows, s.first_seen_at, s.last_active_at, s.events, s.letters, s.member,
  sp.place, sp.basis, sp.given, sp.country, sp.latitude, sp.longitude, s.phones
FROM supporters_summary s
  LEFT JOIN supporter_place sp ON sp.supporter_id = s.id
  LEFT JOIN (
    SELECT DISTINCT ON (i.supporter_id) i.supporter_id, i.email FROM supporter_identity i
    ORDER BY i.supporter_id, i.seen_at DESC NULLS LAST, i.email
  ) newest ON newest.supporter_id = s.id;

CREATE UNIQUE INDEX supporters_list_id ON supporters_list (id);
-- The list's default order, newest activity first.
CREATE INDEX supporters_list_active ON supporters_list (last_active_at DESC NULLS LAST, id DESC);

CREATE FUNCTION supporters_added() RETURNS SETOF supporters_list LANGUAGE plpgsql STABLE ROWS 10 AS $$
DECLARE
  newest_kept bigint := (SELECT coalesce(max(l.id), 0) FROM supporters_list l);
  added bigint;
BEGIN
  FOR added IN SELECT n.id FROM supporters n WHERE n.id > newest_kept ORDER BY n.id LOOP
    RETURN QUERY
    SELECT s.id, s.name, s.emails,
      (SELECT i.email FROM supporter_identity i WHERE i.supporter_id = s.id
       ORDER BY i.seen_at DESC NULLS LAST, i.email LIMIT 1),
      s.phone, s.postcode, s.sources, s.luma_follows, s.first_seen_at, s.last_active_at, s.events, s.letters, s.member,
      sp.place, sp.basis, sp.given, sp.country, sp.latitude, sp.longitude, s.phones
    FROM supporters_summary s LEFT JOIN supporter_place sp ON sp.supporter_id = s.id
    WHERE s.id = added;
  END LOOP;
END
$$;

CREATE VIEW supporters_listed AS
SELECT * FROM supporters_list
UNION ALL
SELECT * FROM supporters_added();
