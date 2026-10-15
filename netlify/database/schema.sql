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

SET default_tablespace = '';

SET default_table_access_method = heap;

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
-- Name: campaign_statuses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_statuses (
    politician_id bigint NOT NULL,
    campaign text NOT NULL,
    status text NOT NULL,
    status_date date,
    note text DEFAULT ''::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by text NOT NULL,
    CONSTRAINT campaign_statuses_status_check CHECK ((status = 'signed'::text))
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
    campaign text NOT NULL,
    politician_id bigint NOT NULL,
    sender_name text NOT NULL,
    sender_email text NOT NULL,
    sender_address text NOT NULL,
    sender_postcode text NOT NULL,
    contact_consent boolean NOT NULL,
    subject text NOT NULL,
    reply_hash text NOT NULL,
    status text NOT NULL,
    postmark_message_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    replied_at timestamp with time zone,
    CONSTRAINT letters_status_check CHECK ((status = ANY (ARRAY['sending'::text, 'sent'::text, 'bounced'::text, 'spam_complaint'::text])))
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
-- Name: mp_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mp_checks (
    id bigint NOT NULL,
    at timestamp with time zone DEFAULT now() NOT NULL,
    problems jsonb NOT NULL
);

--
-- Name: mp_checks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.mp_checks ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.mp_checks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: mp_syncs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mp_syncs (
    id bigint NOT NULL,
    at timestamp with time zone DEFAULT now() NOT NULL,
    status text NOT NULL,
    changes jsonb NOT NULL,
    mps jsonb NOT NULL,
    decided_by text,
    decided_at timestamp with time zone,
    CONSTRAINT mp_syncs_status_check CHECK ((status = ANY (ARRAY['applied'::text, 'held'::text, 'discarded'::text])))
);

--
-- Name: mp_syncs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.mp_syncs ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.mp_syncs_id_seq
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
    name text NOT NULL,
    salutation text DEFAULT ''::text NOT NULL,
    constituency text,
    party text DEFAULT ''::text NOT NULL,
    email text,
    is_test boolean DEFAULT false NOT NULL,
    sitting boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    test_postcode text,
    airtable_id text,
    CONSTRAINT politicians_house_check CHECK ((house = ANY (ARRAY['commons'::text, 'lords'::text, 'scottish-parliament'::text, 'senedd'::text, 'ni-assembly'::text, 'other'::text]))),
    CONSTRAINT politicians_test_postcode CHECK ((is_test = (test_postcode IS NOT NULL)))
);

--
-- Name: politicians_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.politicians ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.politicians_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
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
    browser_hash text
);

--
-- Name: staff_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_sessions (
    token_hash text NOT NULL,
    email text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL
);

--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);

--
-- Name: campaign_statuses campaign_statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_statuses
    ADD CONSTRAINT campaign_statuses_pkey PRIMARY KEY (politician_id, campaign);

--
-- Name: letter_events letter_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.letter_events
    ADD CONSTRAINT letter_events_pkey PRIMARY KEY (id);

--
-- Name: letters letters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.letters
    ADD CONSTRAINT letters_pkey PRIMARY KEY (id);

--
-- Name: letters letters_postmark_message_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.letters
    ADD CONSTRAINT letters_postmark_message_id_key UNIQUE (postmark_message_id);

--
-- Name: letters letters_reply_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.letters
    ADD CONSTRAINT letters_reply_hash_key UNIQUE (reply_hash);

--
-- Name: mp_checks mp_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mp_checks
    ADD CONSTRAINT mp_checks_pkey PRIMARY KEY (id);

--
-- Name: mp_syncs mp_syncs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mp_syncs
    ADD CONSTRAINT mp_syncs_pkey PRIMARY KEY (id);

--
-- Name: politicians politicians_airtable_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.politicians
    ADD CONSTRAINT politicians_airtable_id_key UNIQUE (airtable_id);

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
-- Name: audit_log_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_log_at ON public.audit_log USING btree (at DESC);

--
-- Name: campaign_statuses_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX campaign_statuses_campaign ON public.campaign_statuses USING btree (campaign, status);

--
-- Name: letter_events_letter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX letter_events_letter_id ON public.letter_events USING btree (letter_id, at);

--
-- Name: letters_sender_email_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX letters_sender_email_campaign ON public.letters USING btree (lower(sender_email), campaign);

--
-- Name: politicians_sitting_constituency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX politicians_sitting_constituency ON public.politicians USING btree (constituency) WHERE (sitting AND (house = 'commons'::text));

--
-- Name: staff_login_links_email_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX staff_login_links_email_created_at ON public.staff_login_links USING btree (lower(email), created_at);

--
-- Name: staff_sessions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX staff_sessions_expires_at ON public.staff_sessions USING btree (expires_at);

--
-- Name: campaign_statuses campaign_statuses_politician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_statuses
    ADD CONSTRAINT campaign_statuses_politician_id_fkey FOREIGN KEY (politician_id) REFERENCES public.politicians(id) ON DELETE CASCADE;

--
-- Name: letter_events letter_events_letter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.letter_events
    ADD CONSTRAINT letter_events_letter_id_fkey FOREIGN KEY (letter_id) REFERENCES public.letters(id) ON DELETE CASCADE;

--
-- Name: letters letters_politician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.letters
    ADD CONSTRAINT letters_politician_id_fkey FOREIGN KEY (politician_id) REFERENCES public.politicians(id);

--
-- PostgreSQL database dump complete
--
