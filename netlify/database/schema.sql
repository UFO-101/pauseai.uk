-- The database schema, as the migrations in netlify/database/migrations/
-- leave it. Generated, for reference only: nothing runs this file, and
-- Netlify applies only the migrations.
--
-- Don't edit it by hand. To change the schema, add a migration, then run
--   npm run db:schema
-- and commit this file with the migration, so the PR shows both. That
-- applies every migration to a throwaway database and dumps its schema with
-- pg_dump 18. netlify/database/schema.test.ts fails while this file is out
-- of date.

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: email_permission(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.email_permission(for_topic text, for_address text) RETURNS TABLE(send text, reason text, at timestamp with time zone, source text)
    LANGUAGE sql STABLE
    AS $$
SELECT r.send, r.reason, r.at, r.source FROM (
  -- A block overrides everything.
  SELECT 1, 'no', 'blocked', p.at, p.kind
  FROM email_blocks b JOIN email_problems p ON p.id = b.problem_id WHERE b.address = for_address
  UNION ALL
  -- Then an opt-out in force.
  SELECT 2, 'no', 'unsubscribed', o.unsubscribed_at, o.source
  FROM opt_outs o WHERE o.address = for_address AND o.list = for_topic AND o.resubscribed_at IS NULL
  UNION ALL
  -- A contact of the calendar.
  SELECT 3, 'yes', 'following', f.since, 'luma'
  FROM (SELECT min(l.contact_since) AS since FROM luma_people l WHERE l.email = for_address) f
  WHERE for_topic = 'luma-calendar' AND f.since IS NOT NULL
  UNION ALL
  SELECT 4, 'no', 'not-following', NULL, NULL WHERE for_topic = 'luma-calendar'
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
  WHERE for_topic = 'pauseai-updates'
  UNION ALL
  -- The consent box on the newest letter.
  SELECT 3, CASE WHEN l.contact_consent THEN 'yes' ELSE 'no' END,
    CASE WHEN l.contact_consent THEN 'asked' ELSE 'declined' END, l.created_at, 'letter'
  FROM (SELECT s.contact_consent, l.created_at FROM supporter_letters s JOIN letters l ON l.id = s.id
        WHERE lower(trim(s.sender_email)) = for_address
        ORDER BY l.created_at DESC, l.id DESC LIMIT 1) l
  WHERE for_topic = 'events-and-ways-to-help'
) r (rank, send, reason, at, source)
ORDER BY r.rank LIMIT 1
$$;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ask_kind_statuses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ask_kind_statuses (
    kind text NOT NULL,
    status text NOT NULL,
    CONSTRAINT ask_kind_statuses_kind_check CHECK ((kind = ANY (ARRAY['letter'::text, 'event'::text])))
);

--
-- Name: ask_statuses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ask_statuses (
    notable_person_id bigint NOT NULL,
    ask text NOT NULL,
    ask_kind text NOT NULL,
    status text NOT NULL,
    status_date date,
    note text DEFAULT ''::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by text NOT NULL
);

--
-- Name: asks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asks (
    slug text NOT NULL,
    title text NOT NULL,
    kind text NOT NULL,
    date date,
    CONSTRAINT asks_kind_check CHECK ((kind = ANY (ARRAY['letter'::text, 'event'::text]))),
    CONSTRAINT asks_slug_check CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))
);

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id bigint NOT NULL,
    at timestamp with time zone DEFAULT now() NOT NULL,
    actor text NOT NULL,
    action text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL
);

--
-- Name: audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.audit_log ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaigns (
    slug text NOT NULL,
    title text NOT NULL,
    ask text,
    CONSTRAINT campaigns_slug_check CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))
);

--
-- Name: email_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_blocks (
    address text NOT NULL,
    problem_id bigint NOT NULL,
    CONSTRAINT email_blocks_address_check CHECK ((address = lower(address)))
);

--
-- Name: luma_people; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.luma_people (
    user_id text NOT NULL,
    email text NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    contact_since timestamp with time zone,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    contact_seen_at timestamp with time zone,
    CONSTRAINT luma_people_email_check CHECK ((email = lower(email)))
);

--
-- Name: members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.members (
    id text NOT NULL,
    email text NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    phone text,
    city text,
    postcode text,
    joined_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL,
    keep_informed boolean NOT NULL,
    share_permission boolean NOT NULL,
    source_page text,
    intent text,
    source_modified_at timestamp with time zone NOT NULL,
    first_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    removed_at timestamp with time zone,
    CONSTRAINT members_email_check CHECK ((email = lower(email)))
);

--
-- Name: opt_outs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opt_outs (
    id bigint NOT NULL,
    address text NOT NULL,
    list text NOT NULL,
    source text NOT NULL,
    source_ref text NOT NULL,
    unsubscribed_at timestamp with time zone NOT NULL,
    resubscribed_at timestamp with time zone,
    CONSTRAINT opt_outs_address_check CHECK ((address = lower(address))),
    CONSTRAINT opt_outs_list_check CHECK ((list = ANY (ARRAY['luma-calendar'::text, 'pauseai-updates'::text]))),
    CONSTRAINT opt_outs_source_check CHECK ((source = ANY (ARRAY['luma-webhook'::text, 'luma-contacts'::text])))
);

--
-- Name: supporter_letters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supporter_letters (
    id bigint NOT NULL,
    kind text DEFAULT 'supporter'::text NOT NULL,
    campaign text NOT NULL,
    sender_name text NOT NULL,
    sender_email text NOT NULL,
    sender_address text NOT NULL,
    sender_postcode text NOT NULL,
    contact_consent boolean NOT NULL,
    subject text NOT NULL,
    reply_hash text NOT NULL,
    CONSTRAINT supporter_letters_kind_check CHECK ((kind = 'supporter'::text))
);

--
-- Name: email_permissions; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.email_permissions AS
 SELECT t.topic,
    t.address,
    d.send,
    d.reason,
    d.at,
    d.source
   FROM (( SELECT 'luma-calendar'::text AS topic,
            luma_people.email AS address
           FROM public.luma_people
        UNION
         SELECT 'pauseai-updates'::text,
            members.email
           FROM public.members
        UNION
         SELECT 'events-and-ways-to-help'::text,
            lower(TRIM(BOTH FROM supporter_letters.sender_email)) AS lower
           FROM public.supporter_letters
        UNION
         SELECT opt_outs.list,
            opt_outs.address
           FROM public.opt_outs
          WHERE (opt_outs.resubscribed_at IS NULL)) t
     CROSS JOIN LATERAL public.email_permission(t.topic, t.address) d(send, reason, at, source));

--
-- Name: email_problems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_problems (
    id bigint NOT NULL,
    at timestamp with time zone DEFAULT now() NOT NULL,
    address text NOT NULL,
    message_id text,
    kind text NOT NULL,
    reason text DEFAULT ''::text NOT NULL,
    can_reset boolean NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT email_problems_address_check CHECK ((address = lower(address))),
    CONSTRAINT email_problems_check CHECK (((kind <> 'complaint'::text) OR (NOT can_reset))),
    CONSTRAINT email_problems_kind_check CHECK ((kind = ANY (ARRAY['hard'::text, 'soft'::text, 'complaint'::text])))
);

--
-- Name: email_problems_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.email_problems ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.email_problems_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: email_sends; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_sends (
    id bigint NOT NULL,
    at timestamp with time zone DEFAULT now() NOT NULL,
    purpose text NOT NULL,
    letter_id bigint,
    address text NOT NULL,
    outcome text NOT NULL,
    message_id text,
    CONSTRAINT email_sends_check CHECK (((outcome = 'sent'::text) = (message_id IS NOT NULL))),
    CONSTRAINT email_sends_outcome_check CHECK ((outcome = ANY (ARRAY['sent'::text, 'refused'::text, 'failed'::text]))),
    CONSTRAINT email_sends_purpose_check CHECK ((purpose = ANY (ARRAY['letter'::text, 'forwarded-reply'::text, 'staff-login'::text, 'staff-alert'::text])))
);

--
-- Name: email_sends_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.email_sends ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.email_sends_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: email_unsubscribes; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.email_unsubscribes AS
 SELECT o.list AS topic,
    o.address,
    d.send,
    d.reason,
    d.at,
    d.source
   FROM (public.opt_outs o
     CROSS JOIN LATERAL public.email_permission(o.list, o.address) d(send, reason, at, source))
  WHERE ((o.resubscribed_at IS NULL) AND (d.reason = 'unsubscribed'::text));

--
-- Name: import_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_runs (
    id bigint NOT NULL,
    at timestamp with time zone DEFAULT now() NOT NULL,
    job text NOT NULL,
    started_by text,
    status text NOT NULL,
    error text,
    result jsonb DEFAULT '{}'::jsonb NOT NULL,
    decided_by text,
    decided_at timestamp with time zone,
    CONSTRAINT import_runs_check CHECK (((status = 'failed'::text) = (error IS NOT NULL))),
    CONSTRAINT import_runs_job_check CHECK ((job = ANY (ARRAY['sync-mps'::text, 'check-mps'::text, 'import-controlai'::text, 'import-signatories'::text, 'import-luma'::text, 'import-members'::text]))),
    CONSTRAINT import_runs_status_check CHECK ((status = ANY (ARRAY['ok'::text, 'failed'::text, 'unchanged'::text, 'held'::text, 'applied'::text, 'discarded'::text])))
);

--
-- Name: import_runs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.import_runs ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.import_runs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: letter_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.letter_events (
    id bigint NOT NULL,
    letter_id bigint NOT NULL,
    at timestamp with time zone DEFAULT now() NOT NULL,
    status text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL
);

--
-- Name: letter_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.letter_events ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.letter_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: letters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.letters (
    id bigint NOT NULL,
    notable_person_id bigint CONSTRAINT letters_politician_id_not_null NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    replied_at timestamp with time zone,
    kind text NOT NULL,
    CONSTRAINT letters_kind_check CHECK ((kind = 'supporter'::text)),
    CONSTRAINT letters_status_check CHECK ((status = ANY (ARRAY['sending'::text, 'sent'::text, 'not_sent'::text, 'bounced'::text, 'spam_complaint'::text])))
);

--
-- Name: letters_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.letters ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.letters_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: luma_erased; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.luma_erased (
    user_id text NOT NULL,
    erased_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: luma_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.luma_events (
    id text NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    start_at timestamp with time zone NOT NULL,
    access text NOT NULL,
    city text,
    latitude double precision,
    longitude double precision,
    first_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    guests_synced_at timestamp with time zone,
    guests_error text,
    removed_at timestamp with time zone,
    CONSTRAINT luma_events_access_check CHECK ((access = ANY (ARRAY['manage'::text, 'view'::text]))),
    CONSTRAINT luma_events_check CHECK (((latitude IS NULL) = (longitude IS NULL)))
);

--
-- Name: luma_guests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.luma_guests (
    id text NOT NULL,
    event_id text NOT NULL,
    user_id text NOT NULL,
    approval_status text NOT NULL,
    registered_at timestamp with time zone NOT NULL,
    phone text,
    postcode text,
    utm_source text,
    removed_at timestamp with time zone,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT luma_guests_approval_status_check CHECK ((approval_status = ANY (ARRAY['approved'::text, 'pending_approval'::text, 'waitlist'::text, 'declined'::text])))
);

--
-- Name: luma_import_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.luma_import_state (
    list text NOT NULL,
    full_pass_at timestamp with time zone,
    cursor text DEFAULT ''::text NOT NULL,
    pass_started_at timestamp with time zone,
    CONSTRAINT luma_import_state_list_check CHECK ((list = ANY (ARRAY['events'::text, 'contacts'::text])))
);

--
-- Name: members_erased; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.members_erased (
    id text NOT NULL,
    erased_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: notable_people; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notable_people (
    id bigint NOT NULL,
    kind text NOT NULL,
    name text NOT NULL,
    forename text,
    surname text,
    salutation text DEFAULT ''::text NOT NULL,
    email text,
    status text DEFAULT 'in_office'::text NOT NULL,
    notes text DEFAULT ''::text NOT NULL,
    important_target boolean DEFAULT false NOT NULL,
    personal_connection boolean DEFAULT false NOT NULL,
    airtable_id text,
    airtable_removed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notable_people_check CHECK (((forename IS NULL) = (surname IS NULL))),
    CONSTRAINT notable_people_check1 CHECK (((forename IS NULL) OR ((forename <> ''::text) AND (surname <> ''::text)))),
    CONSTRAINT notable_people_check2 CHECK (((airtable_removed_at IS NULL) OR (airtable_id IS NOT NULL))),
    CONSTRAINT notable_people_kind_check CHECK ((kind = 'politician'::text)),
    CONSTRAINT notable_people_status_check CHECK ((status = ANY (ARRAY['in_office'::text, 'died'::text, 'retired'::text, 'left_office'::text])))
);

--
-- Name: notable_people_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.notable_people ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.notable_people_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: opt_outs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.opt_outs ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.opt_outs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: politicians; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.politicians (
    id bigint NOT NULL,
    house text NOT NULL,
    constituency text,
    party text DEFAULT ''::text NOT NULL,
    is_test boolean DEFAULT false NOT NULL,
    test_postcode text,
    kind text DEFAULT 'politician'::text NOT NULL,
    country text,
    city text,
    CONSTRAINT politicians_country_check CHECK ((country = ANY (ARRAY['england'::text, 'scotland'::text, 'wales'::text, 'northern-ireland'::text]))),
    CONSTRAINT politicians_house_check CHECK ((house = ANY (ARRAY['commons'::text, 'lords'::text, 'scottish-parliament'::text, 'senedd'::text, 'ni-assembly'::text, 'other'::text]))),
    CONSTRAINT politicians_kind_check CHECK ((kind = 'politician'::text)),
    CONSTRAINT politicians_test_postcode CHECK ((is_test = (test_postcode IS NOT NULL)))
);

--
-- Name: staff_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_accounts (
    email text NOT NULL,
    permissions text[] DEFAULT '{}'::text[] NOT NULL,
    added_by text NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login_at timestamp with time zone,
    last_seen_at timestamp with time zone,
    CONSTRAINT staff_accounts_email_check CHECK ((email = lower(email))),
    CONSTRAINT staff_accounts_email_pauseai CHECK ((email ~ '^[^@[:space:]]+@pauseai\.uk$'::text)),
    CONSTRAINT staff_accounts_permissions_check CHECK ((permissions <@ ARRAY['admin'::text, 'supporters'::text]))
);

--
-- Name: staff_login_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_login_links (
    token_hash text NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    browser_hash text,
    remember boolean DEFAULT false NOT NULL
);

--
-- Name: staff_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_sessions (
    token_hash text NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    remember boolean DEFAULT false NOT NULL,
    user_agent text
);

--
-- Name: supporter_activity_letter; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.supporter_activity_letter AS
 SELECT s.id AS source_id,
    l.created_at AS at,
    'letter'::text AS kind,
    s.campaign AS title,
    p.name AS detail,
    ('/staff/politicians/'::text || p.id) AS href,
    l.status
   FROM ((public.supporter_letters s
     JOIN public.letters l ON ((l.id = s.id)))
     JOIN public.notable_people p ON ((p.id = l.notable_person_id)))
UNION ALL
 SELECT s.id AS source_id,
    l.replied_at AS at,
    'letter-replied'::text AS kind,
    s.campaign AS title,
    p.name AS detail,
    ('/staff/politicians/'::text || p.id) AS href,
    NULL::text AS status
   FROM ((public.supporter_letters s
     JOIN public.letters l ON ((l.id = s.id)))
     JOIN public.notable_people p ON ((p.id = l.notable_person_id)))
  WHERE (l.replied_at IS NOT NULL);

--
-- Name: supporter_activity_luma; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.supporter_activity_luma AS
 SELECT p.user_id AS source_id,
    p.contact_since AS at,
    'luma-contact'::text AS kind,
    NULL::text AS title,
    NULL::text AS detail,
    NULL::text AS href,
    NULL::text AS status
   FROM public.luma_people p
  WHERE (p.contact_since IS NOT NULL)
UNION ALL
 SELECT g.user_id AS source_id,
    g.registered_at AS at,
    'luma-registered'::text AS kind,
    e.name AS title,
    g.approval_status AS detail,
    ('https://luma.com/'::text || e.url) AS href,
    NULL::text AS status
   FROM (public.luma_guests g
     JOIN public.luma_events e ON ((e.id = g.event_id)))
  WHERE (g.removed_at IS NULL);

--
-- Name: supporter_activity_member; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.supporter_activity_member AS
 SELECT id AS source_id,
    joined_at AS at,
    'member-joined'::text AS kind,
    intent AS title,
    source_page AS detail,
    ('https://airtable.com/appWPTGqZmUcs3NWu/tblL1icZBhTV1gQ9o/'::text || id) AS href,
    NULL::text AS status
   FROM public.members m;

--
-- Name: supporter_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supporter_links (
    id bigint NOT NULL,
    supporter_id bigint NOT NULL,
    luma_user_id text,
    letter_id bigint,
    matched_by text NOT NULL,
    matched_value text NOT NULL,
    linked_at timestamp with time zone DEFAULT now() NOT NULL,
    member_id text,
    CONSTRAINT supporter_links_check CHECK ((num_nonnulls(luma_user_id, letter_id, member_id) = 1)),
    CONSTRAINT supporter_links_matched_by_check CHECK ((matched_by = 'email'::text)),
    CONSTRAINT supporter_links_matched_value_check CHECK ((matched_value = lower(matched_value)))
);

--
-- Name: supporter_activity; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.supporter_activity AS
 SELECT k.supporter_id,
    'luma'::text AS source,
    a.at,
    a.kind,
    a.title,
    a.detail,
    a.href,
    a.status
   FROM (public.supporter_activity_luma a
     JOIN public.supporter_links k ON ((k.luma_user_id = a.source_id)))
UNION ALL
 SELECT k.supporter_id,
    'letter'::text AS source,
    a.at,
    a.kind,
    a.title,
    a.detail,
    a.href,
    a.status
   FROM (public.supporter_activity_letter a
     JOIN public.supporter_links k ON ((k.letter_id = a.source_id)))
UNION ALL
 SELECT k.supporter_id,
    o.source,
    o.unsubscribed_at AS at,
    'opted-out'::text AS kind,
    o.list AS title,
    o.address AS detail,
    NULL::text AS href,
    NULL::text AS status
   FROM (public.opt_outs o
     JOIN ( SELECT DISTINCT supporter_links.supporter_id,
            supporter_links.matched_value
           FROM public.supporter_links) k ON ((k.matched_value = o.address)))
UNION ALL
 SELECT k.supporter_id,
    o.source,
    o.resubscribed_at AS at,
    'resubscribed'::text AS kind,
    o.list AS title,
    o.address AS detail,
    NULL::text AS href,
    NULL::text AS status
   FROM (public.opt_outs o
     JOIN ( SELECT DISTINCT supporter_links.supporter_id,
            supporter_links.matched_value
           FROM public.supporter_links) k ON ((k.matched_value = o.address)))
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
   FROM (public.supporter_activity_member a
     JOIN public.supporter_links k ON ((k.member_id = a.source_id)));

--
-- Name: supporter_contact_letter; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.supporter_contact_letter AS
 SELECT s.id AS source_id,
    l.created_at AS at,
    NULL::text AS phone,
    s.sender_postcode AS postcode,
    NULL::double precision AS latitude,
    NULL::double precision AS longitude,
    NULL::text AS city
   FROM (public.supporter_letters s
     JOIN public.letters l ON ((l.id = s.id)));

--
-- Name: supporter_contact_luma; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.supporter_contact_luma AS
 SELECT g.user_id AS source_id,
    g.registered_at AS at,
    g.phone,
    g.postcode,
    e.latitude,
    e.longitude,
    e.city
   FROM (public.luma_guests g
     JOIN public.luma_events e ON ((e.id = g.event_id)));

--
-- Name: supporter_contact_member; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.supporter_contact_member AS
 SELECT id AS source_id,
    created_at AS at,
    phone,
    postcode,
    NULL::double precision AS latitude,
    NULL::double precision AS longitude,
    city
   FROM public.members m;

--
-- Name: supporter_contact; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.supporter_contact AS
 SELECT k.supporter_id,
    'luma'::text AS source,
    c.at,
    c.phone,
    c.postcode,
    c.latitude,
    c.longitude,
    c.city
   FROM (public.supporter_contact_luma c
     JOIN public.supporter_links k ON ((k.luma_user_id = c.source_id)))
UNION ALL
 SELECT k.supporter_id,
    'letter'::text AS source,
    c.at,
    c.phone,
    c.postcode,
    c.latitude,
    c.longitude,
    c.city
   FROM (public.supporter_contact_letter c
     JOIN public.supporter_links k ON ((k.letter_id = c.source_id)))
UNION ALL
 SELECT k.supporter_id,
    'member'::text AS source,
    c.at,
    c.phone,
    c.postcode,
    c.latitude,
    c.longitude,
    c.city
   FROM (public.supporter_contact_member c
     JOIN public.supporter_links k ON ((k.member_id = c.source_id)));

--
-- Name: supporter_source_letter; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.supporter_source_letter AS
 SELECT s.id AS source_id,
    lower(TRIM(BOTH FROM s.sender_email)) AS email,
    s.sender_name AS name,
    l.created_at AS seen_at
   FROM (public.supporter_letters s
     JOIN public.letters l ON ((l.id = s.id)));

--
-- Name: supporter_source_luma; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.supporter_source_luma AS
 SELECT user_id AS source_id,
    email,
    name,
    LEAST(contact_since, ( SELECT min(g.registered_at) AS min
           FROM public.luma_guests g
          WHERE (g.user_id = p.user_id))) AS seen_at
   FROM public.luma_people p;

--
-- Name: supporter_source_member; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.supporter_source_member AS
 SELECT id AS source_id,
    email,
    name,
    joined_at AS seen_at
   FROM public.members m;

--
-- Name: supporter_identity; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.supporter_identity AS
 SELECT k.supporter_id,
    'luma'::text AS source,
    s.email,
    s.name,
    s.seen_at
   FROM (public.supporter_source_luma s
     JOIN public.supporter_links k ON ((k.luma_user_id = s.source_id)))
UNION ALL
 SELECT k.supporter_id,
    'letter'::text AS source,
    s.email,
    s.name,
    s.seen_at
   FROM (public.supporter_source_letter s
     JOIN public.supporter_links k ON ((k.letter_id = s.source_id)))
UNION ALL
 SELECT k.supporter_id,
    'member'::text AS source,
    s.email,
    s.name,
    s.seen_at
   FROM (public.supporter_source_member s
     JOIN public.supporter_links k ON ((k.member_id = s.source_id)));

--
-- Name: supporters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supporters (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    first_seen_at timestamp with time zone
);

--
-- Name: supporter_first_seen; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.supporter_first_seen AS
 SELECT id AS supporter_id,
    ( SELECT min(i.seen_at) AS min
           FROM public.supporter_identity i
          WHERE (i.supporter_id = s.id)) AS first_seen_at
   FROM public.supporters s;

--
-- Name: supporter_links_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.supporter_links ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.supporter_links_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: supporters_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.supporters ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.supporters_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: supporters_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.supporters_summary AS
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
    (mem.supporter_id IS NOT NULL) AS member
   FROM ((((public.supporters s
     LEFT JOIN ident ON ((ident.supporter_id = s.id)))
     LEFT JOIN act ON ((act.supporter_id = s.id)))
     LEFT JOIN contact ON ((contact.supporter_id = s.id)))
     LEFT JOIN mem ON ((mem.supporter_id = s.id)));

--
-- Name: ask_kind_statuses ask_kind_statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ask_kind_statuses
    ADD CONSTRAINT ask_kind_statuses_pkey PRIMARY KEY (kind, status);

--
-- Name: ask_statuses ask_statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ask_statuses
    ADD CONSTRAINT ask_statuses_pkey PRIMARY KEY (notable_person_id, ask);

--
-- Name: asks asks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asks
    ADD CONSTRAINT asks_pkey PRIMARY KEY (slug);

--
-- Name: asks asks_slug_kind_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asks
    ADD CONSTRAINT asks_slug_kind_key UNIQUE (slug, kind);

--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);

--
-- Name: audit_log audit_log_unblock_note; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.audit_log
    ADD CONSTRAINT audit_log_unblock_note CHECK (((action <> 'unblock address'::text) OR (btrim(COALESCE((details ->> 'note'::text), ''::text)) <> ''::text))) NOT VALID;

--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (slug);

--
-- Name: email_blocks email_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_blocks
    ADD CONSTRAINT email_blocks_pkey PRIMARY KEY (address);

--
-- Name: email_problems email_problems_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_problems
    ADD CONSTRAINT email_problems_pkey PRIMARY KEY (id);

--
-- Name: email_sends email_sends_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_sends
    ADD CONSTRAINT email_sends_pkey PRIMARY KEY (id);

--
-- Name: import_runs import_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_runs
    ADD CONSTRAINT import_runs_pkey PRIMARY KEY (id);

--
-- Name: letter_events letter_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.letter_events
    ADD CONSTRAINT letter_events_pkey PRIMARY KEY (id);

--
-- Name: letters letters_id_kind_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.letters
    ADD CONSTRAINT letters_id_kind_key UNIQUE (id, kind);

--
-- Name: letters letters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.letters
    ADD CONSTRAINT letters_pkey PRIMARY KEY (id);

--
-- Name: luma_erased luma_erased_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.luma_erased
    ADD CONSTRAINT luma_erased_pkey PRIMARY KEY (user_id);

--
-- Name: luma_events luma_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.luma_events
    ADD CONSTRAINT luma_events_pkey PRIMARY KEY (id);

--
-- Name: luma_guests luma_guests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.luma_guests
    ADD CONSTRAINT luma_guests_pkey PRIMARY KEY (id);

--
-- Name: luma_import_state luma_import_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.luma_import_state
    ADD CONSTRAINT luma_import_state_pkey PRIMARY KEY (list);

--
-- Name: luma_people luma_people_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.luma_people
    ADD CONSTRAINT luma_people_pkey PRIMARY KEY (user_id);

--
-- Name: members_erased members_erased_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.members_erased
    ADD CONSTRAINT members_erased_pkey PRIMARY KEY (id);

--
-- Name: members members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_pkey PRIMARY KEY (id);

--
-- Name: notable_people notable_people_airtable_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notable_people
    ADD CONSTRAINT notable_people_airtable_id_key UNIQUE (airtable_id);

--
-- Name: notable_people notable_people_id_kind_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notable_people
    ADD CONSTRAINT notable_people_id_kind_key UNIQUE (id, kind);

--
-- Name: notable_people notable_people_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notable_people
    ADD CONSTRAINT notable_people_pkey PRIMARY KEY (id);

--
-- Name: opt_outs opt_outs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opt_outs
    ADD CONSTRAINT opt_outs_pkey PRIMARY KEY (id);

--
-- Name: opt_outs opt_outs_source_source_ref_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opt_outs
    ADD CONSTRAINT opt_outs_source_source_ref_key UNIQUE (source, source_ref);

--
-- Name: politicians politicians_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.politicians
    ADD CONSTRAINT politicians_pkey PRIMARY KEY (id);

--
-- Name: politicians politicians_test_postcode_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.politicians
    ADD CONSTRAINT politicians_test_postcode_key UNIQUE (test_postcode);

--
-- Name: staff_accounts staff_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_accounts
    ADD CONSTRAINT staff_accounts_pkey PRIMARY KEY (email);

--
-- Name: staff_login_links staff_login_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_login_links
    ADD CONSTRAINT staff_login_links_pkey PRIMARY KEY (token_hash);

--
-- Name: staff_sessions staff_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_sessions
    ADD CONSTRAINT staff_sessions_pkey PRIMARY KEY (token_hash);

--
-- Name: supporter_letters supporter_letters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supporter_letters
    ADD CONSTRAINT supporter_letters_pkey PRIMARY KEY (id);

--
-- Name: supporter_letters supporter_letters_reply_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supporter_letters
    ADD CONSTRAINT supporter_letters_reply_hash_key UNIQUE (reply_hash);

--
-- Name: supporter_links supporter_links_letter_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supporter_links
    ADD CONSTRAINT supporter_links_letter_id_key UNIQUE (letter_id);

--
-- Name: supporter_links supporter_links_luma_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supporter_links
    ADD CONSTRAINT supporter_links_luma_user_id_key UNIQUE (luma_user_id);

--
-- Name: supporter_links supporter_links_member_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supporter_links
    ADD CONSTRAINT supporter_links_member_id_key UNIQUE (member_id);

--
-- Name: supporter_links supporter_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supporter_links
    ADD CONSTRAINT supporter_links_pkey PRIMARY KEY (id);

--
-- Name: supporters supporters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supporters
    ADD CONSTRAINT supporters_pkey PRIMARY KEY (id);

--
-- Name: ask_statuses_ask; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ask_statuses_ask ON public.ask_statuses USING btree (ask, status);

--
-- Name: audit_log_address_blocks; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_address_blocks ON public.audit_log USING btree (((details ->> 'address'::text))) WHERE (action = ANY (ARRAY['block address'::text, 'unblock address'::text]));

--
-- Name: audit_log_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_at ON public.audit_log USING btree (at DESC);

--
-- Name: audit_log_politician_edits; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_politician_edits ON public.audit_log USING btree ((((details ->> 'id'::text))::bigint)) WHERE (action = ANY (ARRAY['add politician'::text, 'edit politician'::text, 'remove politician'::text]));

--
-- Name: audit_log_status_sets; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_status_sets ON public.audit_log USING btree ((((details ->> 'politicianId'::text))::bigint)) WHERE (action = 'set status'::text);

--
-- Name: email_problems_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_problems_address ON public.email_problems USING btree (address, at DESC);

--
-- Name: email_problems_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_problems_at ON public.email_problems USING btree (at DESC, id DESC);

--
-- Name: email_sends_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_sends_address ON public.email_sends USING btree (address, at DESC);

--
-- Name: email_sends_letter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_sends_letter ON public.email_sends USING btree (letter_id);

--
-- Name: email_sends_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_sends_message_id ON public.email_sends USING btree (message_id);

--
-- Name: import_runs_job_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX import_runs_job_at ON public.import_runs USING btree (job, at DESC, id DESC);

--
-- Name: letter_events_letter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX letter_events_letter_id ON public.letter_events USING btree (letter_id, at);

--
-- Name: letters_notable_person; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX letters_notable_person ON public.letters USING btree (notable_person_id);

--
-- Name: luma_events_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX luma_events_start ON public.luma_events USING btree (start_at DESC);

--
-- Name: luma_guests_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX luma_guests_event ON public.luma_guests USING btree (event_id);

--
-- Name: luma_guests_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX luma_guests_user ON public.luma_guests USING btree (user_id, registered_at);

--
-- Name: luma_people_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX luma_people_email ON public.luma_people USING btree (email);

--
-- Name: members_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX members_email ON public.members USING btree (email);

--
-- Name: opt_outs_open; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX opt_outs_open ON public.opt_outs USING btree (address, list) WHERE (resubscribed_at IS NULL);

--
-- Name: politicians_commons_constituency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX politicians_commons_constituency ON public.politicians USING btree (constituency) WHERE (house = 'commons'::text);

--
-- Name: staff_login_links_email_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX staff_login_links_email_created_at ON public.staff_login_links USING btree (lower(email), created_at);

--
-- Name: staff_sessions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX staff_sessions_expires_at ON public.staff_sessions USING btree (expires_at);

--
-- Name: supporter_letters_sender_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX supporter_letters_sender_address ON public.supporter_letters USING btree (lower(TRIM(BOTH FROM sender_email)));

--
-- Name: supporter_letters_sender_email_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX supporter_letters_sender_email_campaign ON public.supporter_letters USING btree (lower(sender_email), campaign);

--
-- Name: supporter_links_matched; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX supporter_links_matched ON public.supporter_links USING btree (matched_by, matched_value);

--
-- Name: supporter_links_supporter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX supporter_links_supporter ON public.supporter_links USING btree (supporter_id);

--
-- Name: supporters_first_seen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX supporters_first_seen ON public.supporters USING btree (first_seen_at);

--
-- Name: ask_statuses ask_statuses_ask_ask_kind_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ask_statuses
    ADD CONSTRAINT ask_statuses_ask_ask_kind_fkey FOREIGN KEY (ask, ask_kind) REFERENCES public.asks(slug, kind);

--
-- Name: ask_statuses ask_statuses_ask_kind_status_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ask_statuses
    ADD CONSTRAINT ask_statuses_ask_kind_status_fkey FOREIGN KEY (ask_kind, status) REFERENCES public.ask_kind_statuses(kind, status);

--
-- Name: ask_statuses ask_statuses_notable_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ask_statuses
    ADD CONSTRAINT ask_statuses_notable_person_id_fkey FOREIGN KEY (notable_person_id) REFERENCES public.notable_people(id) ON DELETE CASCADE;

--
-- Name: campaigns campaigns_ask_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_ask_fkey FOREIGN KEY (ask) REFERENCES public.asks(slug);

--
-- Name: email_blocks email_blocks_problem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_blocks
    ADD CONSTRAINT email_blocks_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.email_problems(id);

--
-- Name: email_sends email_sends_letter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_sends
    ADD CONSTRAINT email_sends_letter_id_fkey FOREIGN KEY (letter_id) REFERENCES public.letters(id) ON DELETE SET NULL;

--
-- Name: letter_events letter_events_letter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.letter_events
    ADD CONSTRAINT letter_events_letter_id_fkey FOREIGN KEY (letter_id) REFERENCES public.letters(id) ON DELETE CASCADE;

--
-- Name: letters letters_notable_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.letters
    ADD CONSTRAINT letters_notable_person_id_fkey FOREIGN KEY (notable_person_id) REFERENCES public.notable_people(id);

--
-- Name: luma_guests luma_guests_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.luma_guests
    ADD CONSTRAINT luma_guests_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.luma_events(id) ON DELETE CASCADE;

--
-- Name: luma_guests luma_guests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.luma_guests
    ADD CONSTRAINT luma_guests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.luma_people(user_id) ON DELETE CASCADE;

--
-- Name: politicians politicians_notable_person_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.politicians
    ADD CONSTRAINT politicians_notable_person_fkey FOREIGN KEY (id, kind) REFERENCES public.notable_people(id, kind) ON DELETE CASCADE;

--
-- Name: supporter_letters supporter_letters_campaign_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supporter_letters
    ADD CONSTRAINT supporter_letters_campaign_fkey FOREIGN KEY (campaign) REFERENCES public.campaigns(slug);

--
-- Name: supporter_letters supporter_letters_letter_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supporter_letters
    ADD CONSTRAINT supporter_letters_letter_fkey FOREIGN KEY (id, kind) REFERENCES public.letters(id, kind) ON DELETE CASCADE;

--
-- Name: supporter_links supporter_links_letter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supporter_links
    ADD CONSTRAINT supporter_links_letter_id_fkey FOREIGN KEY (letter_id) REFERENCES public.supporter_letters(id) ON DELETE CASCADE;

--
-- Name: supporter_links supporter_links_luma_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supporter_links
    ADD CONSTRAINT supporter_links_luma_user_id_fkey FOREIGN KEY (luma_user_id) REFERENCES public.luma_people(user_id) ON DELETE CASCADE;

--
-- Name: supporter_links supporter_links_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supporter_links
    ADD CONSTRAINT supporter_links_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

--
-- Name: supporter_links supporter_links_supporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supporter_links
    ADD CONSTRAINT supporter_links_supporter_id_fkey FOREIGN KEY (supporter_id) REFERENCES public.supporters(id) ON DELETE CASCADE;

--
-- PostgreSQL database dump complete
--
