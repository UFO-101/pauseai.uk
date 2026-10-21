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
-- Name: email_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_blocks (
    address text NOT NULL,
    problem_id bigint NOT NULL,
    CONSTRAINT email_blocks_address_check CHECK ((address = lower(address)))
);

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
    CONSTRAINT import_runs_job_check CHECK ((job = ANY (ARRAY['sync-mps'::text, 'check-mps'::text, 'import-controlai'::text, 'import-signatories'::text, 'import-luma'::text]))),
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    replied_at timestamp with time zone,
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
    CONSTRAINT luma_import_state_list_check CHECK ((list = ANY (ARRAY['events'::text, 'contacts'::text])))
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
    CONSTRAINT luma_people_email_check CHECK ((email = lower(email)))
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
    CONSTRAINT opt_outs_list_check CHECK ((list = 'luma-calendar'::text)),
    CONSTRAINT opt_outs_source_check CHECK ((source = 'luma-webhook'::text))
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
-- Name: letters letters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.letters
    ADD CONSTRAINT letters_pkey PRIMARY KEY (id);

--
-- Name: letters letters_reply_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.letters
    ADD CONSTRAINT letters_reply_hash_key UNIQUE (reply_hash);

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
-- Name: letters_sender_email_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX letters_sender_email_campaign ON public.letters USING btree (lower(sender_email), campaign);

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
-- Name: opt_outs_open; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX opt_outs_open ON public.opt_outs USING btree (address, list) WHERE (resubscribed_at IS NULL);

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
-- Name: letters letters_politician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.letters
    ADD CONSTRAINT letters_politician_id_fkey FOREIGN KEY (politician_id) REFERENCES public.politicians(id);

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
-- PostgreSQL database dump complete
--
