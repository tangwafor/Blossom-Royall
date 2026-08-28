--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.5

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'owner',
    'manager',
    'staff',
    'vendor',
    'customer'
);


--
-- Name: product_media_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.product_media_status AS ENUM (
    'draft',
    'published',
    'archived'
);


--
-- Name: vendor_brand_asset_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vendor_brand_asset_status AS ENUM (
    'submitted',
    'approved',
    'rejected',
    'superseded'
);


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id bigint NOT NULL,
    actor_user_id uuid,
    store_id uuid,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id text,
    before_data jsonb,
    after_data jsonb,
    created_at timestamp with time zone DEFAULT now()
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
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid,
    user_id uuid,
    hourly_rate numeric(10,2),
    status text DEFAULT 'active'::text
);


--
-- Name: leases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid,
    space_code text,
    monthly_rent numeric(12,2) NOT NULL,
    deposit numeric(12,2) DEFAULT 0,
    start_date date NOT NULL,
    end_date date,
    status text DEFAULT 'draft'::text,
    signed_at timestamp with time zone
);


--
-- Name: measurement_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.measurement_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    label text NOT NULL,
    units text DEFAULT 'in'::text,
    measurements jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    variant_id uuid,
    vendor_id uuid,
    qty integer NOT NULL,
    unit_price numeric(12,2) NOT NULL
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid,
    customer_id uuid,
    channel text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    subtotal numeric(12,2) DEFAULT 0,
    tax numeric(12,2) DEFAULT 0,
    total numeric(12,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    method text NOT NULL,
    amount numeric(12,2) NOT NULL,
    status text DEFAULT 'succeeded'::text,
    provider_ref text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: product_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    product_id uuid NOT NULL,
    uploaded_by uuid NOT NULL,
    original_file_name text NOT NULL,
    storage_path text NOT NULL,
    mime_type text NOT NULL,
    byte_size integer NOT NULL,
    sha256 text NOT NULL,
    width_px integer NOT NULL,
    height_px integer NOT NULL,
    alt_text text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    status public.product_media_status DEFAULT 'draft'::public.product_media_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_media_alt_text_check CHECK (((length(alt_text) >= 1) AND (length(alt_text) <= 500))),
    CONSTRAINT product_media_byte_size_check CHECK (((byte_size >= 1) AND (byte_size <= 10000000))),
    CONSTRAINT product_media_check CHECK ((storage_path = (((((((store_id)::text || '/'::text) || (product_id)::text) || '/'::text) || (id)::text) || '/'::text) || original_file_name))),
    CONSTRAINT product_media_height_px_check CHECK ((height_px > 0)),
    CONSTRAINT product_media_mime_type_check CHECK ((mime_type = ANY (ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text]))),
    CONSTRAINT product_media_original_file_name_check CHECK (((length(original_file_name) >= 1) AND (length(original_file_name) <= 255))),
    CONSTRAINT product_media_sha256_check CHECK ((sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT product_media_sort_order_check CHECK ((sort_order >= 0)),
    CONSTRAINT product_media_width_px_check CHECK ((width_px > 0))
);


--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    sku text NOT NULL,
    size text,
    color text,
    price numeric(12,2) NOT NULL,
    qty_on_hand integer DEFAULT 0 NOT NULL
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid,
    vendor_id uuid,
    name text NOT NULL,
    description text,
    category text,
    status text DEFAULT 'draft'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    role public.app_role DEFAULT 'customer'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: readiness_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.readiness_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_slug text DEFAULT 'blossom-royall'::text NOT NULL,
    store_id uuid,
    respondent_role text NOT NULL,
    contact_email text,
    answers jsonb NOT NULL,
    consent_confirmed boolean NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT readiness_submissions_answers_check CHECK (((jsonb_typeof(answers) = 'object'::text) AND (pg_column_size(answers) <= 100000))),
    CONSTRAINT readiness_submissions_consent_confirmed_check CHECK (consent_confirmed),
    CONSTRAINT readiness_submissions_contact_email_check CHECK (((contact_email IS NULL) OR ((contact_email = lower(contact_email)) AND ((length(contact_email) >= 3) AND (length(contact_email) <= 320))))),
    CONSTRAINT readiness_submissions_respondent_role_check CHECK ((respondent_role = ANY (ARRAY['owner'::text, 'vendor'::text, 'prospect'::text]))),
    CONSTRAINT readiness_submissions_status_check CHECK ((status = ANY (ARRAY['new'::text, 'reviewing'::text, 'complete'::text, 'archived'::text]))),
    CONSTRAINT readiness_submissions_tenant_slug_check CHECK ((tenant_slug ~ '^[a-z0-9-]{2,80}$'::text))
);


--
-- Name: rent_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rent_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lease_id uuid,
    amount numeric(12,2) NOT NULL,
    method text,
    paid_at timestamp with time zone DEFAULT now(),
    receipt_no text
);


--
-- Name: store_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid,
    user_id uuid,
    role public.app_role NOT NULL
);


--
-- Name: stores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    address jsonb,
    timezone text DEFAULT 'America/New_York'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: time_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.time_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid,
    clock_in timestamp with time zone NOT NULL,
    clock_out timestamp with time zone,
    break_minutes integer DEFAULT 0,
    approved_by uuid
);


--
-- Name: vendor_brand_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_brand_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    vendor_id uuid NOT NULL,
    uploaded_by uuid NOT NULL,
    contact_email text NOT NULL,
    original_file_name text NOT NULL,
    storage_path text NOT NULL,
    mime_type text NOT NULL,
    byte_size integer NOT NULL,
    sha256 text NOT NULL,
    width_px integer,
    height_px integer,
    rights_confirmed boolean DEFAULT false NOT NULL,
    rights_confirmed_at timestamp with time zone DEFAULT now() NOT NULL,
    status public.vendor_brand_asset_status DEFAULT 'submitted'::public.vendor_brand_asset_status NOT NULL,
    version integer NOT NULL,
    is_current boolean DEFAULT false NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vendor_brand_assets_byte_size_check CHECK (((byte_size >= 1) AND (byte_size <= 5000000))),
    CONSTRAINT vendor_brand_assets_check CHECK ((storage_path = (((((((store_id)::text || '/'::text) || (vendor_id)::text) || '/'::text) || (id)::text) || '/'::text) || original_file_name))),
    CONSTRAINT vendor_brand_assets_check1 CHECK ((((status = 'submitted'::public.vendor_brand_asset_status) AND (reviewed_by IS NULL) AND (reviewed_at IS NULL)) OR ((status <> 'submitted'::public.vendor_brand_asset_status) AND (reviewed_by IS NOT NULL) AND (reviewed_at IS NOT NULL)))),
    CONSTRAINT vendor_brand_assets_check2 CHECK (((NOT is_current) OR (status = 'approved'::public.vendor_brand_asset_status))),
    CONSTRAINT vendor_brand_assets_contact_email_check CHECK (((contact_email = lower(contact_email)) AND ((length(contact_email) >= 3) AND (length(contact_email) <= 320)))),
    CONSTRAINT vendor_brand_assets_height_px_check CHECK (((height_px IS NULL) OR (height_px > 0))),
    CONSTRAINT vendor_brand_assets_mime_type_check CHECK ((mime_type = ANY (ARRAY['image/png'::text, 'image/jpeg'::text, 'image/webp'::text, 'image/svg+xml'::text]))),
    CONSTRAINT vendor_brand_assets_original_file_name_check CHECK (((length(original_file_name) >= 1) AND (length(original_file_name) <= 255))),
    CONSTRAINT vendor_brand_assets_review_note_check CHECK (((review_note IS NULL) OR (length(review_note) <= 2000))),
    CONSTRAINT vendor_brand_assets_rights_confirmed_check CHECK (rights_confirmed),
    CONSTRAINT vendor_brand_assets_sha256_check CHECK ((sha256 ~ '^[a-f0-9]{64}$'::text)),
    CONSTRAINT vendor_brand_assets_version_check CHECK ((version > 0)),
    CONSTRAINT vendor_brand_assets_width_px_check CHECK (((width_px IS NULL) OR (width_px > 0)))
);


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid,
    owner_user_id uuid,
    name text NOT NULL,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: leases leases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leases
    ADD CONSTRAINT leases_pkey PRIMARY KEY (id);


--
-- Name: measurement_profiles measurement_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.measurement_profiles
    ADD CONSTRAINT measurement_profiles_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: product_media product_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_media
    ADD CONSTRAINT product_media_pkey PRIMARY KEY (id);


--
-- Name: product_media product_media_product_id_sort_order_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_media
    ADD CONSTRAINT product_media_product_id_sort_order_key UNIQUE (product_id, sort_order);


--
-- Name: product_media product_media_storage_path_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_media
    ADD CONSTRAINT product_media_storage_path_key UNIQUE (storage_path);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: product_variants product_variants_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_sku_key UNIQUE (sku);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: readiness_submissions readiness_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.readiness_submissions
    ADD CONSTRAINT readiness_submissions_pkey PRIMARY KEY (id);


--
-- Name: rent_payments rent_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rent_payments
    ADD CONSTRAINT rent_payments_pkey PRIMARY KEY (id);


--
-- Name: rent_payments rent_payments_receipt_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rent_payments
    ADD CONSTRAINT rent_payments_receipt_no_key UNIQUE (receipt_no);


--
-- Name: store_memberships store_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_memberships
    ADD CONSTRAINT store_memberships_pkey PRIMARY KEY (id);


--
-- Name: store_memberships store_memberships_store_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_memberships
    ADD CONSTRAINT store_memberships_store_id_user_id_key UNIQUE (store_id, user_id);


--
-- Name: stores stores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_pkey PRIMARY KEY (id);


--
-- Name: time_entries time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_pkey PRIMARY KEY (id);


--
-- Name: vendor_brand_assets vendor_brand_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_brand_assets
    ADD CONSTRAINT vendor_brand_assets_pkey PRIMARY KEY (id);


--
-- Name: vendor_brand_assets vendor_brand_assets_storage_path_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_brand_assets
    ADD CONSTRAINT vendor_brand_assets_storage_path_key UNIQUE (storage_path);


--
-- Name: vendor_brand_assets vendor_brand_assets_vendor_id_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_brand_assets
    ADD CONSTRAINT vendor_brand_assets_vendor_id_version_key UNIQUE (vendor_id, version);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: employees_store_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employees_store_id_idx ON public.employees USING btree (store_id);


--
-- Name: employees_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employees_user_id_idx ON public.employees USING btree (user_id);


--
-- Name: leases_vendor_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leases_vendor_id_idx ON public.leases USING btree (vendor_id);


--
-- Name: measurement_profiles_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX measurement_profiles_customer_id_idx ON public.measurement_profiles USING btree (customer_id);


--
-- Name: order_items_order_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_items_order_id_idx ON public.order_items USING btree (order_id);


--
-- Name: order_items_variant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_items_variant_id_idx ON public.order_items USING btree (variant_id);


--
-- Name: order_items_vendor_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_items_vendor_id_idx ON public.order_items USING btree (vendor_id);


--
-- Name: orders_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_customer_id_idx ON public.orders USING btree (customer_id);


--
-- Name: orders_store_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_store_id_idx ON public.orders USING btree (store_id);


--
-- Name: payments_order_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payments_order_id_idx ON public.payments USING btree (order_id);


--
-- Name: product_media_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_media_product_id_idx ON public.product_media USING btree (product_id);


--
-- Name: product_media_store_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_media_store_id_idx ON public.product_media USING btree (store_id);


--
-- Name: product_media_store_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_media_store_status_idx ON public.product_media USING btree (store_id, status, created_at DESC);


--
-- Name: product_media_uploaded_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_media_uploaded_by_idx ON public.product_media USING btree (uploaded_by);


--
-- Name: product_variants_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX product_variants_product_id_idx ON public.product_variants USING btree (product_id);


--
-- Name: products_store_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_store_id_idx ON public.products USING btree (store_id);


--
-- Name: products_vendor_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_vendor_id_idx ON public.products USING btree (vendor_id);


--
-- Name: readiness_submissions_tenant_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX readiness_submissions_tenant_status_idx ON public.readiness_submissions USING btree (tenant_slug, status, submitted_at DESC);


--
-- Name: rent_payments_lease_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rent_payments_lease_id_idx ON public.rent_payments USING btree (lease_id);


--
-- Name: store_memberships_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX store_memberships_user_id_idx ON public.store_memberships USING btree (user_id);


--
-- Name: time_entries_approved_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX time_entries_approved_by_idx ON public.time_entries USING btree (approved_by);


--
-- Name: time_entries_employee_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX time_entries_employee_id_idx ON public.time_entries USING btree (employee_id);


--
-- Name: vendor_brand_assets_one_current_per_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX vendor_brand_assets_one_current_per_vendor ON public.vendor_brand_assets USING btree (vendor_id) WHERE is_current;


--
-- Name: vendor_brand_assets_review_queue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendor_brand_assets_review_queue ON public.vendor_brand_assets USING btree (store_id, status, created_at DESC);


--
-- Name: vendor_brand_assets_reviewed_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendor_brand_assets_reviewed_by_idx ON public.vendor_brand_assets USING btree (reviewed_by);


--
-- Name: vendor_brand_assets_uploaded_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendor_brand_assets_uploaded_by_idx ON public.vendor_brand_assets USING btree (uploaded_by);


--
-- Name: vendors_owner_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendors_owner_user_id_idx ON public.vendors USING btree (owner_user_id);


--
-- Name: vendors_store_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vendors_store_id_idx ON public.vendors USING btree (store_id);


--
-- Name: measurement_profiles measurement_profiles_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER measurement_profiles_audit AFTER INSERT OR DELETE OR UPDATE ON public.measurement_profiles FOR EACH ROW EXECUTE FUNCTION private.audit_measurement_profile();


--
-- Name: product_media product_media_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER product_media_audit AFTER INSERT OR DELETE OR UPDATE ON public.product_media FOR EACH ROW EXECUTE FUNCTION private.audit_product_media();


--
-- Name: readiness_submissions readiness_submissions_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER readiness_submissions_audit AFTER INSERT OR DELETE OR UPDATE ON public.readiness_submissions FOR EACH ROW EXECUTE FUNCTION private.audit_readiness_submission();


--
-- Name: vendor_brand_assets vendor_brand_asset_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER vendor_brand_asset_audit AFTER INSERT OR DELETE OR UPDATE ON public.vendor_brand_assets FOR EACH ROW EXECUTE FUNCTION private.audit_vendor_brand_asset();


--
-- Name: employees employees_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: employees employees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: leases leases_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leases
    ADD CONSTRAINT leases_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: measurement_profiles measurement_profiles_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.measurement_profiles
    ADD CONSTRAINT measurement_profiles_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id);


--
-- Name: order_items order_items_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id);


--
-- Name: orders orders_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: product_media product_media_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_media
    ADD CONSTRAINT product_media_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_media product_media_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_media
    ADD CONSTRAINT product_media_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: product_media product_media_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_media
    ADD CONSTRAINT product_media_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id);


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: products products_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: readiness_submissions readiness_submissions_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.readiness_submissions
    ADD CONSTRAINT readiness_submissions_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: rent_payments rent_payments_lease_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rent_payments
    ADD CONSTRAINT rent_payments_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES public.leases(id) ON DELETE CASCADE;


--
-- Name: store_memberships store_memberships_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_memberships
    ADD CONSTRAINT store_memberships_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: store_memberships store_memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_memberships
    ADD CONSTRAINT store_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: time_entries time_entries_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id);


--
-- Name: time_entries time_entries_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: vendor_brand_assets vendor_brand_assets_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_brand_assets
    ADD CONSTRAINT vendor_brand_assets_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id);


--
-- Name: vendor_brand_assets vendor_brand_assets_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_brand_assets
    ADD CONSTRAINT vendor_brand_assets_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: vendor_brand_assets vendor_brand_assets_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_brand_assets
    ADD CONSTRAINT vendor_brand_assets_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id);


--
-- Name: vendor_brand_assets vendor_brand_assets_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_brand_assets
    ADD CONSTRAINT vendor_brand_assets_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: vendors vendors_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.profiles(id);


--
-- Name: vendors vendors_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log audit_read_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_read_owner ON public.audit_log FOR SELECT TO authenticated USING ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: vendor_brand_assets brand_assets_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY brand_assets_owner_update ON public.vendor_brand_assets FOR UPDATE TO authenticated USING ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role]))) WITH CHECK ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: vendor_brand_assets brand_assets_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY brand_assets_read ON public.vendor_brand_assets FOR SELECT TO authenticated USING (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (uploaded_by = ( SELECT auth.uid() AS uid)) OR private.owns_vendor(vendor_id)));


--
-- Name: vendor_brand_assets brand_assets_submit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY brand_assets_submit ON public.vendor_brand_assets FOR INSERT TO authenticated WITH CHECK (((uploaded_by = ( SELECT auth.uid() AS uid)) AND (status = 'submitted'::public.vendor_brand_asset_status) AND (NOT is_current) AND ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR private.owns_vendor(vendor_id))));


--
-- Name: employees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

--
-- Name: employees employees_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY employees_access ON public.employees FOR SELECT TO authenticated USING (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (user_id = ( SELECT auth.uid() AS uid))));


--
-- Name: employees employees_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY employees_delete ON public.employees FOR DELETE TO authenticated USING ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: employees employees_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY employees_insert ON public.employees FOR INSERT TO authenticated WITH CHECK ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: employees employees_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY employees_update ON public.employees FOR UPDATE TO authenticated USING ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role]))) WITH CHECK ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: leases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

--
-- Name: leases leases_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leases_access ON public.leases FOR SELECT TO authenticated USING (((private.current_store_role(private.vendor_store(vendor_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR private.owns_vendor(vendor_id)));


--
-- Name: leases leases_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leases_delete ON public.leases FOR DELETE TO authenticated USING ((private.current_store_role(private.vendor_store(vendor_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: leases leases_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leases_insert ON public.leases FOR INSERT TO authenticated WITH CHECK ((private.current_store_role(private.vendor_store(vendor_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: leases leases_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY leases_update ON public.leases FOR UPDATE TO authenticated USING ((private.current_store_role(private.vendor_store(vendor_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role]))) WITH CHECK ((private.current_store_role(private.vendor_store(vendor_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: measurement_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.measurement_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: measurement_profiles measurements_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY measurements_self ON public.measurement_profiles TO authenticated USING ((customer_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((customer_id = ( SELECT auth.uid() AS uid)));


--
-- Name: store_memberships memberships_read_store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY memberships_read_store ON public.store_memberships FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR (private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role]))));


--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items order_items_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY order_items_access ON public.order_items FOR SELECT TO authenticated USING (((private.current_store_role(private.order_store(order_id)) IS NOT NULL) OR private.owns_vendor(vendor_id) OR (EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.customer_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: order_items order_items_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY order_items_delete ON public.order_items FOR DELETE TO authenticated USING ((private.current_store_role(private.order_store(order_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: order_items order_items_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY order_items_insert ON public.order_items FOR INSERT TO authenticated WITH CHECK ((private.current_store_role(private.order_store(order_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'staff'::public.app_role])));


--
-- Name: order_items order_items_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY order_items_update ON public.order_items FOR UPDATE TO authenticated USING ((private.current_store_role(private.order_store(order_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'staff'::public.app_role]))) WITH CHECK ((private.current_store_role(private.order_store(order_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'staff'::public.app_role])));


--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: orders orders_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_access ON public.orders FOR SELECT TO authenticated USING (((private.current_store_role(store_id) IS NOT NULL) OR (customer_id = ( SELECT auth.uid() AS uid))));


--
-- Name: orders orders_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_delete ON public.orders FOR DELETE TO authenticated USING ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: orders orders_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_insert ON public.orders FOR INSERT TO authenticated WITH CHECK (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'staff'::public.app_role])) OR (customer_id = ( SELECT auth.uid() AS uid))));


--
-- Name: orders orders_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_update ON public.orders FOR UPDATE TO authenticated USING ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'staff'::public.app_role]))) WITH CHECK ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role, 'staff'::public.app_role])));


--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: payments payments_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payments_access ON public.payments FOR SELECT TO authenticated USING (((private.current_store_role(private.order_store(order_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = payments.order_id) AND (o.customer_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: payments payments_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payments_delete ON public.payments FOR DELETE TO authenticated USING ((private.current_store_role(private.order_store(order_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: payments payments_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payments_insert ON public.payments FOR INSERT TO authenticated WITH CHECK ((private.current_store_role(private.order_store(order_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: payments payments_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY payments_update ON public.payments FOR UPDATE TO authenticated USING ((private.current_store_role(private.order_store(order_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role]))) WITH CHECK ((private.current_store_role(private.order_store(order_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: product_media; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;

--
-- Name: product_media product_media_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY product_media_delete ON public.product_media FOR DELETE TO authenticated USING (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_media.product_id) AND private.owns_vendor(p.vendor_id))))));


--
-- Name: product_media product_media_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY product_media_insert ON public.product_media FOR INSERT TO authenticated WITH CHECK (((uploaded_by = ( SELECT auth.uid() AS uid)) AND (store_id = private.product_store(product_id)) AND ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_media.product_id) AND private.owns_vendor(p.vendor_id)))))));


--
-- Name: product_media product_media_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY product_media_read ON public.product_media FOR SELECT TO authenticated USING ((private.current_store_role(store_id) IS NOT NULL));


--
-- Name: product_media product_media_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY product_media_update ON public.product_media FOR UPDATE TO authenticated USING (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_media.product_id) AND private.owns_vendor(p.vendor_id)))))) WITH CHECK (((store_id = private.product_store(product_id)) AND ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_media.product_id) AND private.owns_vendor(p.vendor_id)))))));


--
-- Name: product_variants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: products products_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY products_access ON public.products FOR SELECT TO authenticated USING ((private.current_store_role(store_id) IS NOT NULL));


--
-- Name: products products_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY products_delete ON public.products FOR DELETE TO authenticated USING (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR private.owns_vendor(vendor_id)));


--
-- Name: products products_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY products_insert ON public.products FOR INSERT TO authenticated WITH CHECK (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR private.owns_vendor(vendor_id)));


--
-- Name: products products_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY products_update ON public.products FOR UPDATE TO authenticated USING (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR private.owns_vendor(vendor_id))) WITH CHECK (((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR private.owns_vendor(vendor_id)));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_read_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_read_self ON public.profiles FOR SELECT TO authenticated USING ((id = ( SELECT auth.uid() AS uid)));


--
-- Name: profiles profiles_update_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated USING ((id = ( SELECT auth.uid() AS uid))) WITH CHECK ((id = ( SELECT auth.uid() AS uid)));


--
-- Name: readiness_submissions readiness_public_submit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY readiness_public_submit ON public.readiness_submissions FOR INSERT TO authenticated, anon WITH CHECK (((tenant_slug = 'blossom-royall'::text) AND (store_id IS NULL) AND consent_confirmed AND (status = 'new'::text)));


--
-- Name: readiness_submissions readiness_store_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY readiness_store_delete ON public.readiness_submissions FOR DELETE TO authenticated USING (((store_id IS NOT NULL) AND (private.current_store_role(store_id) = 'owner'::public.app_role)));


--
-- Name: readiness_submissions readiness_store_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY readiness_store_read ON public.readiness_submissions FOR SELECT TO authenticated USING (((store_id IS NOT NULL) AND (private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role]))));


--
-- Name: readiness_submissions readiness_store_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY readiness_store_update ON public.readiness_submissions FOR UPDATE TO authenticated USING (((store_id IS NOT NULL) AND (private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])))) WITH CHECK (((store_id IS NOT NULL) AND (private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role]))));


--
-- Name: readiness_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.readiness_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: rent_payments rent_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rent_access ON public.rent_payments FOR SELECT TO authenticated USING (((private.current_store_role(private.lease_store(lease_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.leases l
  WHERE ((l.id = rent_payments.lease_id) AND private.owns_vendor(l.vendor_id))))));


--
-- Name: rent_payments rent_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rent_delete ON public.rent_payments FOR DELETE TO authenticated USING ((private.current_store_role(private.lease_store(lease_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: rent_payments rent_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rent_insert ON public.rent_payments FOR INSERT TO authenticated WITH CHECK ((private.current_store_role(private.lease_store(lease_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: rent_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rent_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: rent_payments rent_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rent_update ON public.rent_payments FOR UPDATE TO authenticated USING ((private.current_store_role(private.lease_store(lease_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role]))) WITH CHECK ((private.current_store_role(private.lease_store(lease_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: store_memberships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_memberships ENABLE ROW LEVEL SECURITY;

--
-- Name: stores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

--
-- Name: stores stores_read_member; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stores_read_member ON public.stores FOR SELECT TO authenticated USING ((private.current_store_role(id) IS NOT NULL));


--
-- Name: time_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: time_entries time_entries_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY time_entries_access ON public.time_entries FOR SELECT TO authenticated USING (((private.current_store_role(private.employee_store(employee_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.employees e
  WHERE ((e.id = time_entries.employee_id) AND (e.user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: time_entries time_entries_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY time_entries_delete ON public.time_entries FOR DELETE TO authenticated USING ((private.current_store_role(private.employee_store(employee_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: time_entries time_entries_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY time_entries_insert ON public.time_entries FOR INSERT TO authenticated WITH CHECK (((private.current_store_role(private.employee_store(employee_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.employees e
  WHERE ((e.id = time_entries.employee_id) AND (e.user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: time_entries time_entries_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY time_entries_update ON public.time_entries FOR UPDATE TO authenticated USING (((private.current_store_role(private.employee_store(employee_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.employees e
  WHERE ((e.id = time_entries.employee_id) AND (e.user_id = ( SELECT auth.uid() AS uid))))))) WITH CHECK (((private.current_store_role(private.employee_store(employee_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.employees e
  WHERE ((e.id = time_entries.employee_id) AND (e.user_id = ( SELECT auth.uid() AS uid)))))));


--
-- Name: product_variants variants_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY variants_access ON public.product_variants FOR SELECT TO authenticated USING ((private.current_store_role(private.product_store(product_id)) IS NOT NULL));


--
-- Name: product_variants variants_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY variants_delete ON public.product_variants FOR DELETE TO authenticated USING (((private.current_store_role(private.product_store(product_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_variants.product_id) AND private.owns_vendor(p.vendor_id))))));


--
-- Name: product_variants variants_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY variants_insert ON public.product_variants FOR INSERT TO authenticated WITH CHECK (((private.current_store_role(private.product_store(product_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_variants.product_id) AND private.owns_vendor(p.vendor_id))))));


--
-- Name: product_variants variants_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY variants_update ON public.product_variants FOR UPDATE TO authenticated USING (((private.current_store_role(private.product_store(product_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_variants.product_id) AND private.owns_vendor(p.vendor_id)))))) WITH CHECK (((private.current_store_role(private.product_store(product_id)) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])) OR (EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_variants.product_id) AND private.owns_vendor(p.vendor_id))))));


--
-- Name: vendor_brand_assets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendor_brand_assets ENABLE ROW LEVEL SECURITY;

--
-- Name: vendors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

--
-- Name: vendors vendors_delete_store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vendors_delete_store ON public.vendors FOR DELETE TO authenticated USING ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: vendors vendors_insert_store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vendors_insert_store ON public.vendors FOR INSERT TO authenticated WITH CHECK ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- Name: vendors vendors_read_store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vendors_read_store ON public.vendors FOR SELECT TO authenticated USING ((private.current_store_role(store_id) IS NOT NULL));


--
-- Name: vendors vendors_update_store; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vendors_update_store ON public.vendors FOR UPDATE TO authenticated USING ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role]))) WITH CHECK ((private.current_store_role(store_id) = ANY (ARRAY['owner'::public.app_role, 'manager'::public.app_role])));


--
-- PostgreSQL database dump complete
--

